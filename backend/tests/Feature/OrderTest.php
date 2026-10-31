<?php

namespace Tests\Feature;

use App\Models\Part;
use App\Models\Service;
use Tests\TestCase;

class OrderTest extends TestCase
{
    public function test_order_can_be_created_with_status_new(): void
    {
        $this->signIn();
        $order = $this->makeOrder();

        $response = $this->postJson('/api/orders', [
            'device_id' => $order->device_id,
            'master_id' => $order->master_id,
            'problem' => 'Шумить вентилятор',
        ])->assertCreated();

        $response->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.status_label', 'Нова');
    }

    public function test_total_cost_is_calculated_with_client_discount(): void
    {
        $this->signIn();
        $order = $this->makeOrder(discount: 10);
        $service = Service::create(['name' => 'Діагностика', 'price' => 1000]);
        $part = Part::create(['name' => 'SSD', 'price' => 500, 'stock' => 5]);

        $this->postJson("/api/orders/{$order->id}/works", ['service_id' => $service->id, 'quantity' => 1])
            ->assertOk();
        $response = $this->postJson("/api/orders/{$order->id}/parts", ['part_id' => $part->id, 'quantity' => 2])
            ->assertOk();

        // (1000 + 2 * 500) = 2000, знижка 10% = 200, до сплати 1800
        $response->assertJsonPath('data.totals.works', 1000)
            ->assertJsonPath('data.totals.parts', 1000)
            ->assertJsonPath('data.totals.discount', 200)
            ->assertJsonPath('data.totals.total', 1800);
    }

    public function test_adding_part_decreases_stock_and_removing_returns_it(): void
    {
        $this->signIn();
        $order = $this->makeOrder();
        $part = Part::create(['name' => 'SSD', 'price' => 500, 'stock' => 5]);

        $response = $this->postJson("/api/orders/{$order->id}/parts", ['part_id' => $part->id, 'quantity' => 3])
            ->assertOk();
        $this->assertSame(2, $part->fresh()->stock);

        $orderPartId = $response->json('data.parts.0.id');
        $this->deleteJson("/api/order-parts/{$orderPartId}")->assertOk();
        $this->assertSame(5, $part->fresh()->stock);
    }

    public function test_cannot_use_more_parts_than_in_stock(): void
    {
        $this->signIn();
        $order = $this->makeOrder();
        $part = Part::create(['name' => 'SSD', 'price' => 500, 'stock' => 1]);

        $this->postJson("/api/orders/{$order->id}/parts", ['part_id' => $part->id, 'quantity' => 2])
            ->assertStatus(422)
            ->assertJsonValidationErrors('quantity');
        $this->assertSame(1, $part->fresh()->stock);
    }

    public function test_status_follows_allowed_transitions_only(): void
    {
        $this->signIn();
        $order = $this->makeOrder();

        // з «Нова» одразу у «Видана» не можна
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'issued'])
            ->assertStatus(422);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'diagnostics'])
            ->assertOk()
            ->assertJsonPath('data.status', 'diagnostics');
    }

    public function test_cancelling_order_returns_parts_to_stock(): void
    {
        $this->signIn();
        $order = $this->makeOrder();
        $part = Part::create(['name' => 'SSD', 'price' => 500, 'stock' => 5]);
        $this->postJson("/api/orders/{$order->id}/parts", ['part_id' => $part->id, 'quantity' => 2]);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'cancelled'])->assertOk();

        $this->assertSame(5, $part->fresh()->stock);
    }

    public function test_closed_order_cannot_be_changed(): void
    {
        $this->signIn();
        $order = $this->makeOrder();
        $service = Service::create(['name' => 'Діагностика', 'price' => 200]);
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'cancelled'])->assertOk();

        $this->postJson("/api/orders/{$order->id}/works", ['service_id' => $service->id, 'quantity' => 1])
            ->assertStatus(422);
    }

    public function test_orders_can_be_searched_and_filtered(): void
    {
        $this->signIn();
        $first = $this->makeOrder();
        $second = $this->makeOrder();
        $second->device->client->update(['full_name' => 'Шевченко Марія']);
        $second->forceFill(['status' => 'ready'])->save();

        $this->getJson('/api/orders?search=Шевченко')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $second->id);

        $this->getJson('/api/orders?status=ready')->assertJsonCount(1, 'data');
        // число в пошуку може бути номером заявки (і частиною телефону), тому перевіряємо наявність
        $ids = $this->getJson("/api/orders?search={$first->id}")->json('data.*.id');
        $this->assertContains($first->id, $ids);
        $this->getJson('/api/orders')->assertJsonCount(2, 'data');
    }
}
