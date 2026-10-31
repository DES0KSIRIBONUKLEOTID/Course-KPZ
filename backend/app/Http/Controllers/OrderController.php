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
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->from, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($request->to, fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
            ->when($request->search, fn ($query, $text) => $this->applySearch($query, trim($text)))
            ->latest('id')
            ->paginate(15);

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

    public function show(Order $order)
    {
        return $this->respond($order);
    }

    public function changeStatus(Request $request, Order $order)
    {
        $data = $request->validate(['status' => ['required', Rule::enum(OrderStatus::class)]]);

        $this->orders->changeStatus($order, OrderStatus::from($data['status']));

        return $this->respond($order);
    }

    public function addWork(Request $request, Order $order)
    {
        $data = $request->validate([
            'service_id' => ['required', 'exists:services,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $this->orders->addWork($order, Service::findOrFail($data['service_id']), $data['quantity']);

        return $this->respond($order);
    }

    public function removeWork(OrderWork $work)
    {
        $order = $work->order;
        $this->orders->removeWork($work);

        return $this->respond($order);
    }

    public function addPart(Request $request, Order $order)
    {
        $data = $request->validate([
            'part_id' => ['required', 'exists:parts,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $this->orders->addPart($order, Part::findOrFail($data['part_id']), $data['quantity']);

        return $this->respond($order);
    }

    public function removePart(OrderPart $part)
    {
        $order = $part->order;
        $this->orders->removePart($part);

        return $this->respond($order);
    }

    /** Повертає актуальну заявку (з перерахованою вартістю). */
    private function respond(Order $order)
    {
        return (new OrderResource($order->load(self::RELATIONS)))->response();
    }
}
