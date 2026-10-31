<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class AuthAndAccessTest extends TestCase
{
    public function test_employee_can_login_and_get_token(): void
    {
        User::factory()->create(['email' => 'a@test.com', 'password' => 'secret12']);

        $this->postJson('/api/login', ['email' => 'a@test.com', 'password' => 'secret12'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'role']]);
    }

    public function test_wrong_password_is_rejected(): void
    {
        User::factory()->create(['email' => 'a@test.com', 'password' => 'secret12']);

        $this->postJson('/api/login', ['email' => 'a@test.com', 'password' => 'wrong'])
            ->assertStatus(422);
    }

    public function test_inactive_employee_cannot_login(): void
    {
        User::factory()->create(['email' => 'a@test.com', 'password' => 'secret12', 'is_active' => false]);

        $this->postJson('/api/login', ['email' => 'a@test.com', 'password' => 'secret12'])
            ->assertStatus(422);
    }

    public function test_api_requires_authentication(): void
    {
        $this->getJson('/api/orders')->assertUnauthorized();
    }

    public function test_master_cannot_change_price_list_but_can_read_it(): void
    {
        $this->signIn(User::MASTER);

        $this->getJson('/api/services')->assertOk();
        $this->postJson('/api/services', ['name' => 'Чистка', 'price' => 100])->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
    }

    public function test_admin_can_manage_price_list_and_users(): void
    {
        $this->signIn(User::ADMIN);

        $this->postJson('/api/services', ['name' => 'Чистка', 'price' => 100])->assertCreated();
        $this->postJson('/api/users', [
            'name' => 'Новий майстер', 'email' => 'm@test.com', 'password' => 'secret12', 'role' => 'master',
        ])->assertCreated();
        $this->getJson('/api/users')->assertOk();
    }

    public function test_last_admin_cannot_be_deactivated(): void
    {
        $admin = $this->signIn(User::ADMIN);

        $this->putJson("/api/users/{$admin->id}", [
            'name' => $admin->name, 'email' => $admin->email, 'role' => 'admin', 'is_active' => false,
        ])->assertStatus(422);
    }
}
