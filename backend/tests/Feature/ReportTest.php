<?php

namespace Tests\Feature;

use App\Models\Service;
use Tests\TestCase;

class ReportTest extends TestCase
{
    public function test_report_counts_revenue_of_issued_orders(): void
    {
        $this->signIn();
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

    public function test_report_requires_valid_period(): void
    {
        $this->signIn();

        $this->getJson('/api/reports/summary?from=2026-10-10&to=2026-10-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors('to');
    }
}
