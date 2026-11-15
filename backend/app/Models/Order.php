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
            'status_changed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // у момент створення заявка щойно отримала свій перший статус
        static::creating(function (Order $order) {
            $order->status_changed_at ??= now();
        });
    }

    /** Скільки секунд заявка перебуває в поточному статусі. */
    public function secondsInStatus(): int
    {
        return $this->status_changed_at ? (int) $this->status_changed_at->diffInSeconds(now(), true) : 0;
    }

    /** Ремонт затягнувся: статус «В ремонті» триває довше за ліміт із config/service.php. */
    public function isOverdue(): bool
    {
        return $this->status === OrderStatus::InRepair
            && $this->secondsInStatus() > config('service.repair_overdue_hours') * 3600;
    }

    /** Вибірка заявок, у яких ремонт затягнувся (для сповіщень). */
    public function scopeOverdue($query)
    {
        return $query->where('status', OrderStatus::InRepair)
            ->where('status_changed_at', '<=', now()->subHours(config('service.repair_overdue_hours')));
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
