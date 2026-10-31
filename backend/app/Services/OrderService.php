<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderPart;
use App\Models\OrderWork;
use App\Models\Part;
use App\Models\Service;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Бізнес-логіка заявки: статуси, роботи, запчастини та склад.
 * Помилки повертаються як ValidationException (HTTP 422).
 */
class OrderService
{
    public function changeStatus(Order $order, OrderStatus $new): void
    {
        if (! in_array($new, $order->status->allowedNext(), true)) {
            $this->fail('status', "Перехід «{$order->status->label()}» → «{$new->label()}» неможливий");
        }

        DB::transaction(function () use ($order, $new) {
            // при скасуванні запчастини повертаються на склад
            if ($new === OrderStatus::Cancelled) {
                foreach ($order->parts as $part) {
                    $this->removePart($part);
                }
            }

            $order->status = $new;
            $order->closed_at = $new->isFinal() ? now() : null;
            $order->save();
        });
    }

    public function addWork(Order $order, Service $service, int $quantity): OrderWork
    {
        $this->ensureEditable($order);

        return $order->works()->create([
            'service_id' => $service->id,
            'name' => $service->name,
            'price' => $service->price,
            'quantity' => $quantity,
        ]);
    }

    public function removeWork(OrderWork $work): void
    {
        $this->ensureEditable($work->order);
        $work->delete();
    }

    public function addPart(Order $order, Part $part, int $quantity): OrderPart
    {
        $this->ensureEditable($order);

        return DB::transaction(function () use ($order, $part, $quantity) {
            $part = Part::lockForUpdate()->find($part->id);

            if ($part->stock < $quantity) {
                $this->fail('quantity', "Недостатньо на складі: є {$part->stock} шт.");
            }

            $part->decrement('stock', $quantity);

            return $order->parts()->create([
                'part_id' => $part->id,
                'name' => $part->name,
                'price' => $part->price,
                'quantity' => $quantity,
            ]);
        });
    }

    public function removePart(OrderPart $orderPart): void
    {
        $this->ensureEditable($orderPart->order);

        $this->returnToStock($orderPart);
    }

    /** Повертає запчастину зі заявки на склад і видаляє її із заявки. */
    private function returnToStock(OrderPart $orderPart): void
    {
        DB::transaction(function () use ($orderPart) {
            Part::whereKey($orderPart->part_id)->increment('stock', $orderPart->quantity);
            $orderPart->delete();
        });
    }

    /** Закриту заявку (видану або скасовану) змінювати не можна. */
    private function ensureEditable(Order $order): void
    {
        if ($order->status->isFinal()) {
            $this->fail('order', 'Заявку закрито — змінювати роботи та запчастини не можна');
        }
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
