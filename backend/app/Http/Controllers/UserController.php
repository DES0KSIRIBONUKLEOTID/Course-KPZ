<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Керування працівниками (лише адміністратор), крім списку майстрів. */
class UserController extends Controller
{
    /** Активні працівники, яким можна призначити заявку (доступно всім). */
    public function masters()
    {
        return User::where('is_active', true)->orderBy('name')->get(['id', 'name']);
    }

    public function index()
    {
        return User::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in([User::ADMIN, User::MASTER])],
        ]);

        return response()->json(User::create($data), 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users')->ignore($user)],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', Rule::in([User::ADMIN, User::MASTER])],
            'is_active' => ['required', 'boolean'],
        ]);

        $loosesAdminRights = $user->isAdmin() && ($data['role'] !== User::ADMIN || ! $data['is_active']);
        $activeAdmins = User::where('role', User::ADMIN)->where('is_active', true)->count();

        if ($loosesAdminRights && $activeAdmins <= 1) {
            abort(422, 'Не можна вимкнути або понизити останнього адміністратора');
        }

        if (empty($data['password'])) {
            unset($data['password']); // порожній пароль = не змінювати
        }

        $user->update($data);

        if (! $user->is_active) {
            $user->tokens()->delete(); // вимкнений працівник одразу втрачає доступ
        }

        return $user;
    }
}
