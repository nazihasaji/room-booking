<?php

namespace App\Http\Controllers\Admin;

use App\GraphMailService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ManageUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(private GraphMailService $graphMailService) {}

    public function index(): Response
    {
        return Inertia::render('Admin/Users/Index', [
            'users' => User::query()
                ->orderBy('name')
                ->orderBy('id')
                ->paginate(10)
                ->through(fn (User $user): array => $this->userData($user)),
        ]);
    }

    public function store(ManageUserRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'] ?? Str::random(40),
        ]);
        $user->is_super_admin = $request->boolean('is_super_admin');
        $user->save();

        if (! $request->boolean('send_invitation')) {
            return to_route('admin.users.index')->with('success', 'Account created.');
        }

        $token = Password::broker()->createToken($user);
        $invitationUrl = route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ]);
        $invitationWasSent = $this->graphMailService->sendAccountInvitation($user, $invitationUrl);

        return to_route('admin.users.index')->with(
            $invitationWasSent ? 'success' : 'error',
            $invitationWasSent
                ? 'Account created and invitation email sent.'
                : 'Account created, but the invitation email could not be sent. Set a temporary password and share it securely.',
        );
    }

    public function update(ManageUserRequest $request, User $user): RedirectResponse
    {
        $isSuperAdmin = $request->boolean('is_super_admin');

        if ($request->user()->is($user) && ! $isSuperAdmin) {
            return back()->with('error', 'You cannot remove your own super-admin access.');
        }

        if ($user->isSuperAdmin() && ! $isSuperAdmin && $this->isOnlySuperAdmin()) {
            return back()->with('error', 'At least one super administrator must remain.');
        }

        $data = $request->validated();
        $user->fill([
            'name' => $data['name'],
            'email' => $data['email'],
        ]);

        if (filled($data['password'] ?? null)) {
            $user->password = $data['password'];
        }

        $user->is_super_admin = $isSuperAdmin;
        $user->save();

        return to_route('admin.users.index')->with('success', 'Account updated.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->is($user)) {
            return back()->with('error', 'You cannot delete your own account here.');
        }

        if ($user->isSuperAdmin() && $this->isOnlySuperAdmin()) {
            return back()->with('error', 'At least one super administrator must remain.');
        }

        $user->delete();

        return to_route('admin.users.index')->with('success', 'Account deleted.');
    }

    private function isOnlySuperAdmin(): bool
    {
        return User::query()->where('is_super_admin', true)->count() === 1;
    }

    /**
     * @return array{id: int, name: string, email: string, is_super_admin: bool, created_at: string}
     */
    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_super_admin' => $user->isSuperAdmin(),
            'created_at' => $user->created_at->toIso8601String(),
        ];
    }
}
