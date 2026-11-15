<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Tests\TestCase;

/**
 * Час у статусі та сповіщення про затягнутий ремонт.
 */
class OrderTimeTest extends TestCase
{
    /** Заявка в ремонті, статус якої змінено вказану кількість годин тому. */
    private function repairOf(User $master, int $hoursAgo): Order
    {
        $order = $this->makeOrder();
        $order->forceFill([
            'master_id' => $master->id,
            'status' => OrderStatus::InRepair,
            'status_changed_at' => now()->subHours($hoursAgo),
        ])->save();

        return $order;
    }

    public function test_status_change_time_is_set_on_create_and_on_status_change(): void
    {
        $this->signIn(User::ADMIN);
        $order = $this->makeOrder();
        $this->assertNotNull($order->fresh()->status_changed_at);

        $order->forceFill(['status_changed_at' => now()->subDays(2)])->save();
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'diagnostics'])->assertOk();

        // після зміни статусу відлік іде спочатку
        $this->assertLessThan(60, $order->fresh()->secondsInStatus());
    }

    public function test_order_card_shows_time_in_status(): void
    {
        $admin = $this->signIn(User::ADMIN);
        $order = $this->repairOf($admin, 5);

        $response = $this->getJson("/api/orders/{$order->id}")->assertOk();
        $this->assertEqualsWithDelta(5 * 3600, $response->json('data.status_seconds'), 5);
        $response->assertJsonPath('data.is_overdue', false);
    }

    public function test_long_repair_is_marked_overdue(): void
    {
        $admin = $this->signIn(User::ADMIN);
        $limit = config('service.repair_overdue_hours');
        $late = $this->repairOf($admin, $limit + 1);

        $this->getJson("/api/orders/{$late->id}")
            ->assertOk()
            ->assertJsonPath('data.is_overdue', true)
            ->assertJsonPath('data.overdue_after_hours', $limit);
    }

    public function test_only_repair_status_can_be_overdue(): void
    {
        $admin = $this->signIn(User::ADMIN);
        $order = $this->makeOrder();
        $order->forceFill(['master_id' => $admin->id, 'status_changed_at' => now()->subDays(30)])->save();

        // статус «Нова» навіть через місяць не вважається затягнутим ремонтом
        $this->getJson("/api/orders/{$order->id}")->assertJsonPath('data.is_overdue', false);
        $this->getJson('/api/overdue-orders')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_overdue_list_for_admin_contains_all_late_repairs(): void
    {
        $admin = $this->signIn(User::ADMIN);
        $other = User::factory()->create();
        $limit = config('service.repair_overdue_hours');
        $this->repairOf($admin, $limit + 10);
        $this->repairOf($other, $limit + 5);
        $this->repairOf($other, 1); // ремонт іще в межах ліміту

        $this->getJson('/api/overdue-orders')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_master_gets_overdue_notifications_only_for_own_orders(): void
    {
        $master = $this->signIn(User::MASTER);
        $other = User::factory()->create();
        $limit = config('service.repair_overdue_hours');
        $own = $this->repairOf($master, $limit + 3);
        $this->repairOf($other, $limit + 30);

        $this->getJson('/api/overdue-orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);
    }
}
