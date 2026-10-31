<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Order;
use App\Models\Part;
use App\Models\Service;
use App\Models\User;
use App\Services\OrderService;
use App\Enums\OrderStatus;
use Illuminate\Database\Seeder;

/**
 * Демонстраційні дані: працівники, прайс, склад, клієнти та кілька заявок.
 * Вхід: admin@service.test / admin123 (адміністратор), master@service.test / master123 (майстер).
 */
class DatabaseSeeder extends Seeder
{
    public function run(OrderService $orders): void
    {
        // Працівники
        User::create(['name' => 'Коваленко Олег', 'email' => 'admin@service.test', 'password' => 'admin123', 'role' => User::ADMIN]);
        $master = User::create(['name' => 'Мельник Андрій', 'email' => 'master@service.test', 'password' => 'master123', 'role' => User::MASTER]);
        $master2 = User::create(['name' => 'Шевченко Ірина', 'email' => 'iryna@service.test', 'password' => 'master123', 'role' => User::MASTER]);

        // Прайс-лист
        $services = collect([
            'Діагностика' => 200, 'Чистка від пилу' => 450, 'Заміна термопасти' => 350,
            'Встановлення Windows' => 500, 'Заміна екрана' => 600, 'Заміна SSD/HDD' => 300,
            'Видалення вірусів' => 400, 'Ремонт роз’єму живлення' => 700,
        ])->map(fn ($price, $name) => Service::create(['name' => $name, 'price' => $price]));

        // Склад
        $parts = collect([
            ['SSD 480 ГБ', 1200, 10], ['ОЗП 8 ГБ DDR4 SO-DIMM', 900, 8], ['Матриця 15.6"', 3200, 3],
            ['Блок живлення 65 Вт', 750, 6], ['Термопаста', 150, 20], ['Клавіатура для ноутбука', 650, 5],
        ])->map(fn ($p) => Part::create(['name' => $p[0], 'price' => $p[1], 'stock' => $p[2]]));

        // Клієнти та техніка
        $ivan = Client::create(['full_name' => 'Петренко Іван Сергійович', 'phone' => '+380501112233', 'email' => 'ivan@example.com', 'discount' => 5]);
        $olena = Client::create(['full_name' => 'Бондаренко Олена Василівна', 'phone' => '+380672223344', 'discount' => 0]);
        $taras = Client::create(['full_name' => 'Ткаченко Тарас Миколайович', 'phone' => '+380933334455', 'discount' => 10]);

        $laptop = $ivan->devices()->create(['type' => 'Ноутбук', 'brand' => 'Lenovo', 'model' => 'IdeaPad 3', 'serial_number' => 'LN12345']);
        $pc = $olena->devices()->create(['type' => 'Комп’ютер', 'brand' => 'HP', 'model' => 'ProDesk 400', 'serial_number' => 'HP98765']);
        $printer = $taras->devices()->create(['type' => 'Принтер', 'brand' => 'Canon', 'model' => 'PIXMA G3411']);

        // Заявки на різних етапах
        $issued = Order::create(['device_id' => $laptop->id, 'master_id' => $master->id, 'problem' => 'Ноутбук гріється і шумить']);
        $orders->addWork($issued, $services['Діагностика'], 1);
        $orders->addWork($issued, $services['Чистка від пилу'], 1);
        $orders->addPart($issued, $parts[4], 1);
        foreach ([OrderStatus::Diagnostics, OrderStatus::Ready, OrderStatus::Issued] as $status) {
            $orders->changeStatus($issued, $status);
        }

        $inRepair = Order::create(['device_id' => $pc->id, 'master_id' => $master2->id, 'problem' => 'Не вмикається, немає зображення']);
        $orders->addWork($inRepair, $services['Діагностика'], 1);
        $orders->addPart($inRepair, $parts[3], 1);
        $orders->changeStatus($inRepair, OrderStatus::Diagnostics);
        $orders->changeStatus($inRepair, OrderStatus::InRepair);

        Order::create(['device_id' => $printer->id, 'master_id' => $master->id, 'problem' => 'Смуги на друку']);
    }
}
