<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderPart;
use App\Models\OrderWork;
use App\Models\Part;
use App\Models\Service;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    /** Зв'язки, потрібні для OrderResource. */
    private const RELATIONS = ['device.client', 'master', 'works', 'parts'];

    public function __construct(private OrderService $orders)
    {
    }

    /** Усі статуси (для фільтра на фронтенді). */
    public function statuses()
    {
        return array_map(fn ($status) => $status->toOption(), OrderStatus::cases());
    }

    /**
     * Пошук заявок: ?search=текст&status=ready&from=2026-01-01&to=2026-01-31
     * Текст шукається в номері заявки, ПІБ і телефоні клієнта, техніці, серійному номері, несправності.
     */
    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $orders = Order::with(self::RELATIONS)
            // майстер бачить лише свої заявки
            ->when(! $request->user()->isAdmin(), fn ($query) => $query->where('master_id', $request->user()->id))
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->from, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($request->to, fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
            ->when($request->search, fn ($query, $text) => $this->applySearch($query, trim($text)))
            ->latest('id')
            ->paginate(15);

        return OrderResource::collection($orders);
    }

    /**
     * Кількість заявок за статусами для швидких фільтрів: {all: 5, new: 2, in_repair: 1, ...}.
     * Майстер бачить лише свої, адміністратор усі.
     */
    public function counts(Request $request)
    {
        $byStatus = Order::query()
            ->when(! $request->user()->isAdmin(), fn ($query) => $query->where('master_id', $request->user()->id))
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $counts = ['all' => (int) $byStatus->sum()];
        foreach (OrderStatus::cases() as $status) {
            $counts[$status->value] = (int) ($byStatus[$status->value] ?? 0);
        }

        return $counts;
    }

    /**
     * Заявки із затягнутим ремонтом (для сповіщень): найстаріші першими.
     * Майстер бачить лише свої, адміністратор усі.
     */
    public function overdue(Request $request)
    {
        $orders = Order::with(self::RELATIONS)
            ->overdue()
            ->when(! $request->user()->isAdmin(), fn ($query) => $query->where('master_id', $request->user()->id))
            ->orderBy('status_changed_at')
            ->limit(50)
            ->get();

        return OrderResource::collection($orders);
    }

    private function applySearch($query, string $text)
    {
        $like = "%{$text}%";

        return $query->where(function ($q) use ($text, $like) {
            $q->where('problem', 'like', $like)
                ->orWhereHas('device', function ($device) use ($like) {
                    $device->where('brand', 'like', $like)
                        ->orWhere('model', 'like', $like)
                        ->orWhere('serial_number', 'like', $like)
                        ->orWhereHas('client', function ($client) use ($like) {
                            $client->where('full_name', 'like', $like)
                                ->orWhere('phone', 'like', $like);
                        });
                });

            if (ctype_digit($text)) {
                $q->orWhere('orders.id', (int) $text);
            }
        });
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'device_id' => ['required', 'exists:devices,id'],
            'master_id' => ['required', Rule::exists('users', 'id')->where('is_active', true)],
            'problem' => ['required', 'string'],
        ]);

        $order = Order::create($data);

        return $this->respond($order)->setStatusCode(201);
    }

    public function show(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);

        return $this->respond($order);
    }

    public function changeStatus(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);
        $data = $request->validate(['status' => ['required', Rule::enum(OrderStatus::class)]]);

        $this->orders->changeStatus($order, OrderStatus::from($data['status']));

        return $this->respond($order);
    }

    public function addWork(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);
        $data = $request->validate([
            'service_id' => ['required', 'exists:services,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $this->orders->addWork($order, Service::findOrFail($data['service_id']), $data['quantity']);

        return $this->respond($order);
    }

    public function removeWork(Request $request, OrderWork $work)
    {
        $order = $work->order;
        $this->authorizeOrder($request, $order);
        $this->orders->removeWork($work);

        return $this->respond($order);
    }

    public function addPart(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);
        $data = $request->validate([
            'part_id' => ['required', 'exists:parts,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $this->orders->addPart($order, Part::findOrFail($data['part_id']), $data['quantity']);

        return $this->respond($order);
    }

    public function removePart(Request $request, OrderPart $part)
    {
        $order = $part->order;
        $this->authorizeOrder($request, $order);
        $this->orders->removePart($part);

        return $this->respond($order);
    }

    /** Майстер працює лише зі своїми заявками, адміністратор з усіма. */
    private function authorizeOrder(Request $request, Order $order): void
    {
        $user = $request->user();

        if (! $user->isAdmin() && $order->master_id !== $user->id) {
            abort(403, 'Це не ваша заявка');
        }
    }

    /** Повертає актуальну заявку (з перерахованою вартістю). */
    private function respond(Order $order)
    {
        return (new OrderResource($order->load(self::RELATIONS)))->response();
    }
}
