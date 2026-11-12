<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login_from_account_management(): void
    {
        $this->get(route('admin.users.index'))
            ->assertRedirect(route('login'));
    }

    public function test_standard_users_are_forbidden_from_account_management(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.users.index'))
            ->assertForbidden();
    }

    public function test_super_admins_can_view_account_management(): void
    {
        $account = User::factory()->create(['name' => 'A Account']);

        $this->actingAs(User::factory()->superAdmin()->create(['name' => 'Z Administrator']))
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Users/Index')
                ->where('users.data.0.id', $account->id)
                ->where('users.data.0.is_super_admin', false));
    }

    public function test_super_admins_can_create_an_account(): void
    {
        $response = $this->actingAs(User::factory()->superAdmin()->create())
            ->post(route('admin.users.store'), [
                'name' => 'Aisha Rahman',
                'email' => 'aisha@example.test',
                'password' => 'SecurePassword1!',
                'password_confirmation' => 'SecurePassword1!',
                'is_super_admin' => true,
                'send_invitation' => false,
            ]);

        $response->assertRedirectToRoute('admin.users.index');
        $this->assertDatabaseHas('users', [
            'name' => 'Aisha Rahman',
            'email' => 'aisha@example.test',
            'is_super_admin' => true,
        ]);
        $hashedPassword = User::query()->where('email', 'aisha@example.test')->value('password');

        $this->assertNotNull($hashedPassword);
        $this->assertTrue(Hash::check('SecurePassword1!', $hashedPassword));
    }

    public function test_super_admins_can_send_an_account_invitation(): void
    {
        config([
            'app.url' => 'https://room-booking.test',
            'services.graph.tenant_id' => 'tenant-id',
            'services.graph.client_id' => 'client-id',
            'services.graph.client_secret' => 'client-secret',
            'services.graph.from_name' => 'Room Booking',
            'services.graph.from_address' => 'bookings@example.com',
        ]);
        Http::preventStrayRequests();
        Http::fake([
            'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token' => Http::response([
                'access_token' => 'graph-access-token',
            ]),
            'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail' => Http::response(status: 202),
        ]);

        $response = $this->actingAs(User::factory()->superAdmin()->create())
            ->post(route('admin.users.store'), [
                'name' => 'Aisha Rahman',
                'email' => 'aisha@example.test',
                'is_super_admin' => true,
                'send_invitation' => true,
            ]);

        $response->assertRedirectToRoute('admin.users.index');
        $this->assertDatabaseHas('users', [
            'name' => 'Aisha Rahman',
            'email' => 'aisha@example.test',
            'is_super_admin' => true,
        ]);
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'aisha@example.test',
        ]);
        Http::assertSent(static fn (Request $request): bool => $request->url() === 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token');
        Http::assertSent(static function (Request $request): bool {
            $data = $request->data();
            $content = $data['message']['body']['content'] ?? '';

            return $request->url() === 'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail'
                && $data['message']['body']['contentType'] === 'HTML'
                && $data['message']['toRecipients'][0]['emailAddress']['address'] === 'aisha@example.test'
                && str_contains($content, '/reset-password/')
                && str_contains($content, 'Set your password')
                && str_contains($content, 'email=aisha%40example.test');
        });
    }

    public function test_super_admins_can_update_another_account(): void
    {
        $account = User::factory()->superAdmin()->create();

        $response = $this->actingAs(User::factory()->superAdmin()->create())
            ->put(route('admin.users.update', $account), [
                'name' => 'Updated Account',
                'email' => 'updated@example.test',
                'password' => 'NewSecurePassword1!',
                'password_confirmation' => 'NewSecurePassword1!',
                'is_super_admin' => false,
            ]);

        $response->assertRedirectToRoute('admin.users.index');
        $account->refresh();

        $this->assertSame('Updated Account', $account->name);
        $this->assertSame('updated@example.test', $account->email);
        $this->assertFalse($account->isSuperAdmin());
        $this->assertTrue(Hash::check('NewSecurePassword1!', $account->password));
    }

    public function test_super_admins_cannot_delete_their_own_account_from_account_management(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)
            ->from(route('admin.users.index'))
            ->delete(route('admin.users.destroy', $superAdmin))
            ->assertRedirect(route('admin.users.index'));

        $this->assertModelExists($superAdmin);
    }

    public function test_super_admins_can_delete_another_account(): void
    {
        $account = User::factory()->create();

        $response = $this->actingAs(User::factory()->superAdmin()->create())
            ->delete(route('admin.users.destroy', $account));

        $response->assertRedirectToRoute('admin.users.index');
        $this->assertModelMissing($account);
    }

    public function test_super_admins_cannot_remove_their_own_super_admin_access(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)
            ->from(route('admin.users.index'))
            ->put(route('admin.users.update', $superAdmin), [
                'name' => $superAdmin->name,
                'email' => $superAdmin->email,
                'is_super_admin' => false,
            ])
            ->assertRedirect(route('admin.users.index'));

        $this->assertTrue($superAdmin->refresh()->isSuperAdmin());
    }
}
