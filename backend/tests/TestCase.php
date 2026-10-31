<?php

namespace Tests;

use App\Models\Client;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /** Входить як адміністратор (або майстер) і повертає працівника. */
    protected function signIn(string $role = User::MASTER): User
    {
        $user = User::factory()->create(['role' => $role]);
        Sanctum::actingAs($user);

        return $user;
    }

    /** Створює клієнта з технікою та заявку для нього. */
    protected function makeOrder(int $discount = 0): Order
    {
        $client = Client::create(['full_name' => 'Петренко Іван', 'phone' => '+380501112233', 'discount' => $discount]);
        $device = $client->devices()->create(['type' => 'Ноутбук', 'brand' => 'Lenovo', 'model' => 'IdeaPad']);
        $master = User::factory()->create();

        return Order::create(['device_id' => $device->id, 'master_id' => $master->id, 'problem' => 'Не вмикається']);
    }
}
