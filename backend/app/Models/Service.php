<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Послуга (робота) з прайс-листа. */
class Service extends Model
{
    protected $fillable = ['name', 'price'];

    protected function casts(): array
    {
        return ['price' => 'float'];
    }
}
