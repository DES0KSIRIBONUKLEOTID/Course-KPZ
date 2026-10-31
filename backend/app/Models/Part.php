<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Запчастина на складі. */
class Part extends Model
{
    protected $fillable = ['name', 'price', 'stock'];

    protected function casts(): array
    {
        return ['price' => 'float'];
    }
}
