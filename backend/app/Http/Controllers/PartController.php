<?php

namespace App\Http\Controllers;

use App\Models\OrderPart;
use App\Models\Part;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Склад запчастин. Читати можуть усі, змінювати — лише адміністратор. */
class PartController extends Controller
{
    private function rules(?Part $part = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('parts')->ignore($part)],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
        ];
    }

    public function index()
    {
        return Part::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        return response()->json(Part::create($request->validate($this->rules())), 201);
    }

    public function update(Request $request, Part $part)
    {
        $part->update($request->validate($this->rules($part)));

        return $part;
    }

    public function destroy(Part $part)
    {
        if (OrderPart::where('part_id', $part->id)->exists()) {
            abort(422, 'Неможливо видалити запчастину, яка використовується в заявках');
        }
        $part->delete();

        return response()->noContent();
    }
}
