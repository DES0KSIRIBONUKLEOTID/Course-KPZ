<?php

namespace Tests\Feature;

use Tests\TestCase;

class ClientTest extends TestCase
{
    public function test_client_and_device_can_be_created(): void
    {
        $this->signIn();

        $id = $this->postJson('/api/clients', [
            'full_name' => 'Петренко Іван', 'phone' => '+380 50 111 22 33', 'discount' => 5,
        ])->assertCreated()->json('id');

        $this->postJson("/api/clients/{$id}/devices", [
            'type' => 'Ноутбук', 'brand' => 'Lenovo', 'model' => 'IdeaPad',
        ])->assertCreated();

        $this->getJson("/api/clients/{$id}/devices")->assertOk()->assertJsonCount(1);
    }

    public function test_short_phone_is_rejected(): void
    {
        $this->signIn();

        $this->postJson('/api/clients', ['full_name' => 'Іван', 'phone' => '12345'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');
    }

    public function test_discount_must_be_between_0_and_100(): void
    {
        $this->signIn();

        $this->postJson('/api/clients', ['full_name' => 'Іван', 'phone' => '0501112233', 'discount' => 150])
            ->assertStatus(422)
            ->assertJsonValidationErrors('discount');
    }

    public function test_client_with_devices_cannot_be_deleted(): void
    {
        $this->signIn();
        $order = $this->makeOrder();

        $this->deleteJson('/api/clients/'.$order->device->client_id)->assertStatus(422);
    }
}
