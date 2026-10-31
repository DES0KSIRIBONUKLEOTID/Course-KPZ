<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = ['full_name', 'phone', 'email', 'discount'];

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }
}
