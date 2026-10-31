<?php

namespace App\Http\Controllers;

use App\Models\OrderWork;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Прайс-лист робіт. Читати можуть усі, змінювати — лише адміністратор. */
class ServiceController extends Controller
{
    private function rules(?Service $service = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('services')->ignore($service)],
            'price' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function index()
    {
        return Service::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        return response()->json(Service::create($request->validate($this->rules())), 201);
    }

    public function update(Request $request, Service $service)
    {
        $service->update($request->validate($this->rules($service)));

        return $service;
    }

    public function destroy(Service $service)
    {
        if (OrderWork::where('service_id', $service->id)->exists()) {
            abort(422, 'Неможливо видалити послугу, яка використовується в заявках');
        }
        $service->delete();

        return response()->noContent();
    }
}
