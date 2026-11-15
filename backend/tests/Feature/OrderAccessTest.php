<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Tests\TestCase;

/**
 * Права на заявки: створює лише адміністратор, майстер бачить і змінює тільки свої заявки.
 */
class OrderAccessTest extends TestCase
{
    /** Заявка, призначена вказаному майстру. */
    private function orderOf(User $master): Order
    {
        $order = $this->makeOrder();
        $order->update(['master_id' => $master->id]);

        return $order;
    }

    public function test_master_cannot_create_orders(): void
    {
        $master = $this->signIn(User::MASTER);
        $order = $this->orderOf($master);

        $this->postJson('/api/orders', [
            'device_id' => $order->device_id,
            'master_id' => $master->id,
            'problem' => 'Не вмикається',
        ])->assertForbidden();
    }

    public function test_admin_can_create_orders(): void
    {
        $admin = $this->signIn(User::ADMIN);
        $order = $this->makeOrder();

        $this->postJson('/api/orders', [
            'device_id' => $order->device_id,
            'master_id' => $order->master_id,
            'problem' => 'Не вмикається',
        ])->assertCreated();
    }

    public function test_master_sees_only_own_orders_in_list(): void
    {
        $master = $this->signIn(User::MASTER);
        $own = $this->orderOf($master);
        $this->makeOrder(); // заявка іншого майстра

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);
    }

    public function test_admin_sees_all_orders_in_list(): void
    {
        $this->signIn(User::ADMIN);
        $this->makeOrder();
        $this->makeOrder();

        $this->getJson('/api/orders')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_master_cannot_open_or_change_foreign_order(): void
    {
        $this->signIn(User::MASTER);
        $foreign = $this->makeOrder();
        $service = Service::create(['name' => 'Діагностика', 'price' => 200]);

        $this->getJson("/api/orders/{$foreign->id}")->assertForbidden();
        $this->patchJson("/api/orders/{$foreign->id}/status", ['status' => 'diagnostics'])->assertForbidden();
        $this->postJson("/api/orders/{$foreign->id}/works", ['service_id' => $service->id, 'quantity' => 1])
            ->assertForbidden();
        $this->assertSame('new', $foreign->fresh()->status->value);
    }

    public function test_master_can_work_with_own_order(): void
    {
        $master = $this->signIn(User::MASTER);
        $own = $this->orderOf($master);
        $service = Service::create(['name' => 'Діагностика', 'price' => 200]);

        $this->getJson("/api/orders/{$own->id}")->assertOk();
        $this->postJson("/api/orders/{$own->id}/works", ['service_id' => $service->id, 'quantity' => 1])->assertOk();
        $this->patchJson("/api/orders/{$own->id}/status", ['status' => 'diagnostics'])
            ->assertOk()
            ->assertJsonPath('data.status', 'diagnostics');
    }

    public function test_master_report_counts_only_own_orders(): void
    {
        $master = $this->signIn(User::MASTER);
        $this->orderOf($master);
        $this->makeOrder(); // чужа заявка не повинна потрапити у звіт

        $today = now()->toDateString();
        $this->getJson("/api/reports/summary?from={$today}&to={$today}")
            ->assertOk()
            ->assertJsonPath('created_count', 1);
    }

    public function test_order_counts_by_status_respect_master_scope(): void
    {
        $master = $this->signIn(User::MASTER);
        $own = $this->orderOf($master);
        $own->forceFill(['status' => 'ready'])->save();
        $this->makeOrder(); // чужа заявка

        $this->getJson('/api/order-counts')
            ->assertOk()
            ->assertJsonPath('all', 1)
            ->assertJsonPath('ready', 1)
            ->assertJsonPath('new', 0);

        $this->signIn(User::ADMIN);
        $this->getJson('/api/order-counts')->assertJsonPath('all', 2)->assertJsonPath('new', 1);
    }

    public function test_master_list_for_assignment_is_admin_only(): void
    {
        $this->signIn(User::MASTER);
        $this->getJson('/api/masters')->assertForbidden();

        $this->signIn(User::ADMIN);
        $this->getJson('/api/masters')->assertOk();
    }
}
