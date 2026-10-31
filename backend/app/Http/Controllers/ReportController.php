<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderWork;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Звіт за період: GET /reports/summary?from=2026-10-01&to=2026-10-31
     * - створені заявки за статусами;
     * - видані заявки: виручка, середній чек, розбивка по майстрах;
     * - найпопулярніші послуги.
     */
    public function summary(Request $request)
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $from = Carbon::parse($data['from'])->startOfDay();
        $to = Carbon::parse($data['to'])->endOfDay();

        // заявки, створені за період
        $createdByStatus = Order::whereBetween('created_at', [$from, $to])
            ->get()
            ->countBy(fn ($order) => $order->status->value);

        // заявки, видані клієнтам за період (саме вони приносять виручку):
        // для кожної — майстер і розрахована вартість
        $issued = Order::with(['device.client', 'master', 'works', 'parts'])
            ->where('status', OrderStatus::Issued)
            ->whereBetween('closed_at', [$from, $to])
            ->get()
            ->map(fn ($order) => ['master' => $order->master->name] + $order->totals());

        $revenue = round($issued->sum('total'), 2);

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
            'top_services' => $this->topServices($from, $to),
        ];
    }

    /** 5 найпопулярніших послуг серед виданих заявок за період. */
    private function topServices(Carbon $from, Carbon $to)
    {
        return OrderWork::join('orders', 'orders.id', '=', 'order_works.order_id')
            ->where('orders.status', OrderStatus::Issued->value)
            ->whereBetween('orders.closed_at', [$from, $to])
            ->groupBy('order_works.name')
            ->orderByDesc('amount')
            ->limit(5)
            ->get([
                'order_works.name',
                DB::raw('SUM(order_works.quantity) as quantity'),
                DB::raw('SUM(order_works.price * order_works.quantity) as amount'),
            ]);
    }
}
