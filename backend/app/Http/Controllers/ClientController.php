<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    private function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'regex:/^(\D*\d){10,}\D*$/'], // мінімум 10 цифр
            'email' => ['nullable', 'email', 'max:255'],
            'discount' => ['nullable', 'integer', 'between:0,100'],
        ];
    }

    public function index()
    {
        return Client::orderBy('full_name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $data['discount'] ??= 0;

        return response()->json(Client::create($data), 201);
    }

    public function show(Client $client)
    {
        return $client;
    }

    public function update(Request $request, Client $client)
    {
        $data = $request->validate($this->rules());
        $data['discount'] ??= 0;
        $client->update($data);

        return $client;
    }

    public function destroy(Client $client)
    {
        if ($client->devices()->exists()) {
            abort(422, 'Неможливо видалити клієнта, у якого є техніка');
        }
        $client->delete();

        return response()->noContent();
    }
}
