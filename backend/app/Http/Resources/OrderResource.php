<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * JSON-представлення заявки. Очікує завантажені зв'язки:
 * device.client, master, works, parts.
 *
 * @mixin \App\Models\Order
 */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $client = $this->device->client;

        return [
            'id' => $this->id,
            'created_at' => $this->created_at->format('Y-m-d H:i'),
            'closed_at' => $this->closed_at?->format('Y-m-d H:i'),
            'problem' => $this->problem,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'allowed_statuses' => array_map(fn ($s) => $s->toOption(), $this->status->allowedNext()),
            'is_closed' => $this->status->isFinal(),
            'client' => [
                'id' => $client->id,
                'full_name' => $client->full_name,
                'phone' => $client->phone,
                'discount' => $client->discount,
            ],
            'device' => [
                'id' => $this->device->id,
                'title' => "{$this->device->type} {$this->device->brand} {$this->device->model}",
                'serial_number' => $this->device->serial_number,
            ],
            'master' => ['id' => $this->master->id, 'name' => $this->master->name],
            'works' => $this->works->map(fn ($w) => [
                'id' => $w->id,
                'name' => $w->name,
                'price' => $w->price,
                'quantity' => $w->quantity,
                'sum' => round($w->price * $w->quantity, 2),
            ]),
            'parts' => $this->parts->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price' => $p->price,
                'quantity' => $p->quantity,
                'sum' => round($p->price * $p->quantity, 2),
            ]),
            'totals' => $this->totals(),
        ];
    }
}
