<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PartController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| REST API сервісного центру (префікс /api)
|--------------------------------------------------------------------------
*/

// Авторизація
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Усі маршрути нижче доступні лише авторизованим працівникам (токен Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Клієнти і техніка
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('clients.devices', DeviceController::class)->shallow()->except('show');

    // Довідники: перегляд - усім, зміна - лише адміністратору
    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/parts', [PartController::class, 'index']);

    // Заявки: адміністратор бачить усі, майстер лише свої (перевіряє контролер)
    Route::get('/order-statuses', [OrderController::class, 'statuses']);
    Route::get('/order-counts', [OrderController::class, 'counts']); // лічильники для швидких фільтрів
    Route::get('/overdue-orders', [OrderController::class, 'overdue']); // сповіщення про затягнутий ремонт
    Route::apiResource('orders', OrderController::class)->only(['index', 'show']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'changeStatus']);
    Route::post('/orders/{order}/works', [OrderController::class, 'addWork']);
    Route::delete('/order-works/{work}', [OrderController::class, 'removeWork']);
    Route::post('/orders/{order}/parts', [OrderController::class, 'addPart']);
    Route::delete('/order-parts/{part}', [OrderController::class, 'removePart']);

    // Звіти
    Route::get('/reports/summary', [ReportController::class, 'summary']);

    // Лише для адміністратора
    Route::middleware('can:admin')->group(function () {
        Route::post('/orders', [OrderController::class, 'store']); // заявки створює лише адміністратор
        Route::get('/masters', [UserController::class, 'masters']);
        Route::apiResource('services', ServiceController::class)->except(['index', 'show']);
        Route::apiResource('parts', PartController::class)->except(['index', 'show']);
        Route::apiResource('users', UserController::class)->only(['index', 'store', 'update']);
    });
});
