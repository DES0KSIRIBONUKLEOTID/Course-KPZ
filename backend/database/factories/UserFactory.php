<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password', // хешується автоматично (cast у моделі)
            'role' => User::MASTER,
            'is_active' => true,
        ];
    }

    public function admin(): static
    {
        return $this->state(['role' => User::ADMIN]);
    }
}
