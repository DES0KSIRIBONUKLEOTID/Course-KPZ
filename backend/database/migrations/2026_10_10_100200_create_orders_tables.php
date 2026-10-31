<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained();
            $table->foreignId('master_id')->constrained('users');
            $table->text('problem');
            $table->string('status')->default('new');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        // Назва і ціна копіюються в заявку, щоб зміна прайсу не змінювала старі заявки
        Schema::create('order_works', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('quantity');
        });

        Schema::create('order_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('quantity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_parts');
        Schema::dropIfExists('order_works');
        Schema::dropIfExists('orders');
    }
};
