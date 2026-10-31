<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Запчастина, використана в заявці. */
class OrderPart extends Model
{
    public $timestamps = false;

    protected $fillable = ['order_id', 'part_id', 'name', 'price', 'quantity'];

    protected function casts(): array
    {
        return ['price' => 'float'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
