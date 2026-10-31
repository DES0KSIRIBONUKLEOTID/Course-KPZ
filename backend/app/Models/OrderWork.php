<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Виконана робота в заявці (ціна фіксується на момент додавання). */
class OrderWork extends Model
{
    public $timestamps = false;

    protected $fillable = ['order_id', 'service_id', 'name', 'price', 'quantity'];

    protected function casts(): array
    {
        return ['price' => 'float'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
