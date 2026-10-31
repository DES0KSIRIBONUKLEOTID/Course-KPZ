<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Device;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    private function rules(): array
    {
        return [
            'type' => ['required', 'string', 'max:100'],
            'brand' => ['required', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:100'],
            'serial_number' => ['nullable', 'string', 'max:100'],
        ];
    }

    /** Техніка конкретного клієнта: GET /clients/{client}/devices */
    public function index(Client $client)
    {
        return $client->devices()->orderBy('id')->get();
    }

    public function store(Request $request, Client $client)
    {
        $device = $client->devices()->create($request->validate($this->rules()));

        return response()->json($device, 201);
    }

    public function update(Request $request, Device $device)
    {
        $device->update($request->validate($this->rules()));

        return $device;
    }

    public function destroy(Device $device)
    {
        if ($device->orders()->exists()) {
            abort(422, 'Неможливо видалити техніку, для якої є заявки');
        }
        $device->delete();

        return response()->noContent();
    }
}
