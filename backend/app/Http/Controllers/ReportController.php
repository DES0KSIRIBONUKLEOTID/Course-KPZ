<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderPart;
use App\Models\OrderWork;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Звіт за період: GET /reports/summary?from=2026-10-01&to=2026-10-31
     * - створені заявки за статусами та по днях;
     * - видані заявки: виручка, середній чек, розбивка по майстрах і типах техніки;
     * - яка техніка, моделі та виробники трапляються найчастіше;
     * - найактивніші клієнти, найпопулярніші послуги й запчастини;
     * - середній час ремонту, частка скасованих, затягнуті ремонти.
     */
    public function summary(Request $request)
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $from = Carbon::parse($data['from'])->startOfDay();
        $to = Carbon::parse($data['to'])->endOfDay();

        // майстер бачить звіт лише по своїх заявках, адміністратор по всіх
        $masterId = $request->user()->isAdmin() ? null : $request->user()->id;

        // заявки, створені за період (з технікою та клієнтом для статистики)
        $created = Order::with('device.client')
            ->whereBetween('created_at', [$from, $to])
            ->when($masterId, fn ($query) => $query->where('master_id', $masterId))
            ->get();
        $createdByStatus = $created->countBy(fn ($order) => $order->status->value);

        // заявки, видані клієнтам за період (саме вони приносять виручку):
        // для кожної - майстер, тип техніки, тривалість ремонту і розрахована вартість
        $issued = Order::with(['device.client', 'master', 'works', 'parts'])
            ->where('status', OrderStatus::Issued)
            ->whereBetween('closed_at', [$from, $to])
            ->when($masterId, fn ($query) => $query->where('master_id', $masterId))
            ->get()
            ->map(fn ($order) => [
                'master' => $order->master->name,
                'type' => $order->device->type,
                'hours' => $order->created_at->diffInMinutes($order->closed_at, true) / 60,
            ] + $order->totals());

        $revenue = round($issued->sum('total'), 2);
        $cancelled = $createdByStatus[OrderStatus::Cancelled->value] ?? 0;

        return [
            'from' => $data['from'],
            'to' => $data['to'],
            'created_count' => $createdByStatus->sum(),
            'by_status' => collect(OrderStatus::cases())->map(fn ($status) => [
                'label' => $status->label(),
                'count' => $createdByStatus[$status->value] ?? 0,
            ])->values(),
            'issued_count' => $issued->count(),
            'revenue' => $revenue,
            'works_sum' => round($issued->sum('works'), 2),
            'parts_sum' => round($issued->sum('parts'), 2),
            'discount_sum' => round($issued->sum('discount'), 2),
            'average_check' => $issued->isEmpty() ? 0 : round($revenue / $issued->count(), 2),
            'by_master' => $issued->groupBy('master')
                ->map(fn ($rows, $master) => [
                    'master' => $master,
                    'issued_count' => $rows->count(),
                    'revenue' => round($rows->sum('total'), 2),
                ])->values(),
            'top_services' => $this->topServices($from, $to, $masterId),

            // додаткова статистика
            'avg_repair_hours' => $issued->isEmpty() ? null : round($issued->avg('hours'), 1),
            'cancelled_count' => $cancelled,
            'cancel_rate' => $created->isEmpty() ? 0 : round($cancelled / $created->count() * 100, 1),
            'overdue_now' => Order::overdue()
                ->when($masterId, fn ($query) => $query->where('master_id', $masterId))
                ->count(),
            'by_device_type' => $this->ranking($created->map(fn ($o) => $o->device->type)),
            'top_models' => $this->ranking($created->map(fn ($o) => "{$o->device->brand} {$o->device->model}"), 5),
            'top_brands' => $this->ranking($created->map(fn ($o) => $o->device->brand), 5),
            // групуємо за клієнтом (а не за іменем), щоб тезки не зливались в одного
            'top_clients' => $created->groupBy(fn ($o) => $o->device->client_id)
                ->map(fn ($rows) => ['name' => $rows->first()->device->client->full_name, 'count' => $rows->count()])
                ->sortByDesc('count')->take(5)->values(),
            'revenue_by_type' => $issued->groupBy('type')
                ->map(fn ($rows, $type) => ['name' => $type, 'count' => $rows->count(), 'amount' => round($rows->sum('total'), 2)])
                ->sortByDesc('amount')->values(),
            'top_parts' => $this->topParts($from, $to, $masterId),
            'daily' => $this->daily($created, $from, $to),
        ];
    }

    /** Рейтинг значень за кількістю повторень: [{name, count}], найчастіші першими. */
    private function ranking(Collection $values, int $limit = 8): Collection
    {
        return $values->countBy()->sortDesc()->take($limit)
            ->map(fn ($count, $name) => ['name' => (string) $name, 'count' => $count])
            ->values();
    }

    /**
     * Кількість створених заявок по днях (для періоду до 62 днів) або по місяцях (для довшого).
     * Порожні дні теж показуються, щоб графік був рівним.
     */
    private function daily(Collection $created, Carbon $from, Carbon $to): Collection
    {
        $byMonth = $from->diffInDays($to) > 62;
        $format = $byMonth ? 'Y-m' : 'Y-m-d';
        $counts = $created->countBy(fn ($order) => $order->created_at->format($format));

        $rows = collect();
        for ($date = $from->copy(); $date <= $to; $byMonth ? $date->addMonthNoOverflow() : $date->addDay()) {
            $key = $date->format($format);
            $rows->push([
                'label' => $byMonth ? $date->format('m.Y') : $date->format('d.m'),
                'count' => $counts[$key] ?? 0,
            ]);
        }

        return $rows;
    }

    /** 5 найпопулярніших послуг серед виданих заявок за період. */
    private function topServices(Carbon $from, Carbon $to, ?int $masterId)
    {
        return OrderWork::join('orders', 'orders.id', '=', 'order_works.order_id')
            ->where('orders.status', OrderStatus::Issued->value)
            ->whereBetween('orders.closed_at', [$from, $to])
            ->when($masterId, fn ($query) => $query->where('orders.master_id', $masterId))
            ->groupBy('order_works.name')
            ->orderByDesc('amount')
            ->limit(5)
            ->get([
                'order_works.name',
                DB::raw('SUM(order_works.quantity) as quantity'),
                DB::raw('SUM(order_works.price * order_works.quantity) as amount'),
            ]);
    }

    /** 5 запчастин, які використовували найчастіше в заявках, створених за період. */
    private function topParts(Carbon $from, Carbon $to, ?int $masterId)
    {
        return OrderPart::join('orders', 'orders.id', '=', 'order_parts.order_id')
            ->whereBetween('orders.created_at', [$from, $to])
            ->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->when($masterId, fn ($query) => $query->where('orders.master_id', $masterId))
            ->groupBy('order_parts.name')
            ->orderByDesc('quantity')
            ->limit(5)
            ->get([
                'order_parts.name',
                DB::raw('SUM(order_parts.quantity) as quantity'),
                DB::raw('SUM(order_parts.price * order_parts.quantity) as amount'),
            ]);
    }
}
