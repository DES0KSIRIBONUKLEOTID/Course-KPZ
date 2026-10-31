<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Заявка на ремонт. */
class Order extends Model
{
    protected $fillable = ['device_id', 'master_id', 'problem'];

    // нова заявка завжди починається зі статусу «Нова»
    protected $attributes = ['status' => 'new'];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'closed_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function master(): BelongsTo
    {
        return $this->belongsTo(User::class, 'master_id');
    }

    public function works(): HasMany
    {
        return $this->hasMany(OrderWork::class);
    }

    public function parts(): HasMany
    {
        return $this->hasMany(OrderPart::class);
    }

    /**
     * Автоматичний розрахунок вартості ремонту:
     * (роботи + запчастини) мінус знижка клієнта.
     */
    public function totals(): array
    {
        $works = round($this->works->sum(fn ($w) => $w->price * $w->quantity), 2);
        $parts = round($this->parts->sum(fn ($p) => $p->price * $p->quantity), 2);
        $percent = $this->device->client->discount;
        $discount = round(($works + $parts) * $percent / 100, 2);

        return [
            'works' => $works,
            'parts' => $parts,
            'discount_percent' => $percent,
            'discount' => $discount,
            'total' => round($works + $parts - $discount, 2),
        ];
    }
}
