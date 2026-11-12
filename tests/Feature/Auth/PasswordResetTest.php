<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Password;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_screen_can_be_rendered(): void
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(200);
    }

    public function test_reset_password_link_is_sent_through_microsoft_graph(): void
    {
        config([
            'services.graph.tenant_id' => 'tenant-id',
            'services.graph.client_id' => 'client-id',
            'services.graph.client_secret' => 'client-secret',
            'services.graph.from_name' => 'Room Reserve',
            'services.graph.from_address' => 'bookings@example.com',
        ]);
        Http::preventStrayRequests();
        Http::fake([
            'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token' => Http::response([
                'access_token' => 'graph-access-token',
            ]),
            'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail' => Http::response(status: 202),
        ]);

        $user = User::factory()->create();

        $response = $this->post('/forgot-password', ['email' => $user->email]);

        $response->assertRedirect();
        $response->assertSessionHas('status');
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
        Http::assertSent(static fn (Request $request): bool => $request->url() === 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token');
        Http::assertSent(static function (Request $request) use ($user): bool {
            $data = $request->data();
            $content = $data['message']['body']['content'] ?? '';

            return $request->url() === 'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail'
                && $data['message']['subject'] === 'Reset your Room Reserve password'
                && $data['message']['body']['contentType'] === 'HTML'
                && $data['message']['toRecipients'][0]['emailAddress']['address'] === $user->email
                && str_contains($content, '/reset-password/')
                && str_contains($content, 'email='.urlencode($user->email))
                && str_contains($content, 'Reset your password');
        });
    }

    public function test_reset_password_screen_can_be_rendered(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $response = $this->get(route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ]));

        $response->assertOk();
    }

    public function test_expired_reset_password_link_displays_the_expired_link_page(): void
    {
        config(['auth.passwords.users.expire' => 3]);

        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->travel(4)->minutes();

        $response = $this->get(route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ]));

        $response
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Auth/ResetLinkExpired'));
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $response = $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'ResetPassword1!',
            'password_confirmation' => 'ResetPassword1!',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('login'));
    }

    public function test_password_reset_rejects_a_password_without_the_required_character_types(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $response = $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => '12345678',
            'password_confirmation' => '12345678',
        ]);

        $response->assertSessionHasErrors('password');
    }

    public function test_password_reset_rejects_the_user_current_password(): void
    {
        $user = User::factory()->create([
            'password' => 'CurrentPassword1!',
        ]);
        $token = Password::broker()->createToken($user);

        $response = $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'CurrentPassword1!',
            'password_confirmation' => 'CurrentPassword1!',
        ]);

        $response->assertSessionHasErrors([
            'password' => 'Your new password must be different from your current password.',
        ]);
        $this->assertTrue(Hash::check('CurrentPassword1!', $user->refresh()->password));
    }
}
