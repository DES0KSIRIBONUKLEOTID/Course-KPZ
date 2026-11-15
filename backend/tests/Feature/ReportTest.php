<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Tests\TestCase;

class ReportTest extends TestCase
{
    public function test_report_counts_revenue_of_issued_orders(): void
    {
        $this->signIn(User::ADMIN);
        $service = Service::create(['name' => 'Діагностика', 'price' => 1000]);

        // видана заявка зі знижкою 10%: 1000 - 100 = 900
        $issued = $this->makeOrder(discount: 10);
        $this->postJson("/api/orders/{$issued->id}/works", ['service_id' => $service->id, 'quantity' => 1]);
        foreach (['diagnostics', 'ready', 'issued'] as $status) {
            $this->patchJson("/api/orders/{$issued->id}/status", ['status' => $status])->assertOk();
        }

        // заявка, яка ще в роботі, у виручку не потрапляє
        $this->makeOrder();

        $today = now()->toDateString();
        $this->getJson("/api/reports/summary?from={$today}&to={$today}")
            ->assertOk()
            ->assertJsonPath('created_count', 2)
            ->assertJsonPath('issued_count', 1)
            ->assertJsonPath('revenue', 900)
            ->assertJsonPath('average_check', 900)
            ->assertJsonPath('top_services.0.name', 'Діагностика');
    }

    public function test_report_shows_which_equipment_is_repaired_most_often(): void
    {
        $this->signIn(User::ADMIN);
        $first = $this->makeOrder();   // Ноутбук Lenovo IdeaPad
        $this->makeOrder();            // ще один ноутбук Lenovo
        $printer = $this->makeOrder(); // принтер
        $printer->device->update(['type' => 'Принтер', 'brand' => 'Canon', 'model' => 'G3411']);

        $today = now()->toDateString();
        $response = $this->getJson("/api/reports/summary?from={$today}&to={$today}")->assertOk();

        $response->assertJsonPath('by_device_type.0.name', 'Ноутбук')
            ->assertJsonPath('by_device_type.0.count', 2)
            ->assertJsonPath('by_device_type.1.name', 'Принтер')
            ->assertJsonPath('top_models.0.name', 'Lenovo IdeaPad')
            ->assertJsonPath('top_brands.0.name', 'Lenovo')
            ->assertJsonPath('top_brands.0.count', 2)
            ->assertJsonPath('top_clients.0.count', 1);
    }

    public function test_report_has_repair_time_cancel_rate_and_daily_chart(): void
    {
        $this->signIn(User::ADMIN);
        $issued = $this->makeOrder();
        $issued->forceFill(['status' => 'issued', 'created_at' => now()->subHours(10), 'closed_at' => now()])->save();
        $cancelled = $this->makeOrder();
        $cancelled->forceFill(['status' => 'cancelled', 'closed_at' => now()])->save();

        $today = now()->toDateString();
        $response = $this->getJson("/api/reports/summary?from={$today}&to={$today}")->assertOk();

        $this->assertEqualsWithDelta(10, $response->json('avg_repair_hours'), 0.1);
        $response->assertJsonPath('cancelled_count', 1)
            ->assertJsonPath('cancel_rate', 50)
            ->assertJsonCount(1, 'daily')
            ->assertJsonPath('daily.0.count', 2); // обидві заявки створено сьогодні
    }

    public function test_master_equipment_statistics_cover_only_own_orders(): void
    {
        $master = $this->signIn(User::MASTER);
        $own = $this->makeOrder();
        $own->update(['master_id' => $master->id]);
        $this->makeOrder(); // чужа заявка

        $today = now()->toDateString();
        $this->getJson("/api/reports/summary?from={$today}&to={$today}")
            ->assertOk()
            ->assertJsonPath('by_device_type.0.count', 1);
    }

    public function test_report_requires_valid_period(): void
    {
        $this->signIn(User::ADMIN);

        $this->getJson('/api/reports/summary?from=2026-10-10&to=2026-10-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors('to');
    }
}
