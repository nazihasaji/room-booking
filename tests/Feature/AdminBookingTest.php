<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login_from_booking_management(): void
    {
        $this->get(route('admin.bookings.index'))
            ->assertRedirect(route('login'));
    }

    public function test_administrators_can_access_booking_management(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.bookings.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Bookings/Index')
                ->has('bookings.data'));
    }

    public function test_super_admins_can_access_booking_management(): void
    {
        $this->actingAs(User::factory()->superAdmin()->create())
            ->get(route('admin.bookings.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Bookings/Index')
                ->has('bookings.data'));
    }

    public function test_super_admins_can_check_availability_for_a_past_booking_date(): void
    {
        $this->actingAs(User::factory()->superAdmin()->create())
            ->getJson(route('bookings.availability', ['date' => '2026-10-01']))
            ->assertOk()
            ->assertJsonPath('date', '2026-10-01');
    }

    public function test_super_admins_can_see_private_booking_details(): void
    {
        $room = Room::factory()->create(['name' => 'Private room']);
        $booking = Booking::factory()->for($room)->create([
            'visitor_name' => 'Aisha Rahman',
            'visitor_email' => 'aisha@example.test',
            'visitor_mobile' => '+60123456789',
            'attendee_count' => 12,
            'refreshment_preference' => 'yes',
            'private_purpose' => 'Quarterly planning session',
        ]);

        $this->actingAs(User::factory()->superAdmin()->create())
            ->get(route('admin.bookings.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Bookings/Index')
                ->where('bookings.data.0.id', $booking->id)
                ->where('bookings.data.0.visitor_name', 'Aisha Rahman')
                ->where('bookings.data.0.visitor_email', 'aisha@example.test')
                ->where('bookings.data.0.visitor_mobile', '+60123456789')
                ->where('bookings.data.0.attendee_count', 12)
                ->where('bookings.data.0.refreshment_preference', 'yes')
                ->where('bookings.data.0.private_purpose', 'Quarterly planning session'));
    }

    public function test_booking_management_paginates_the_table_with_ten_bookings_per_page(): void
    {
        $room = Room::factory()->create();
        Booking::factory()->for($room)->count(11)->create();

        $this->actingAs(User::factory()->superAdmin()->create())
            ->get(route('admin.bookings.index', ['page' => 2]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Bookings/Index')
                ->where('bookings.current_page', 2)
                ->where('bookings.per_page', 10)
                ->where('bookings.total', 11)
                ->has('bookings.data', 1)
                ->has('calendarBookings', 11));
    }

    public function test_administrators_can_add_a_booking(): void
    {
        $room = Room::factory()->create();

        $response = $this->actingAs(User::factory()->create())
            ->post(route('admin.bookings.store'), [
                'room_id' => $room->id,
                'date' => '2026-11-03',
                'start_time' => '10:00',
                'end_time' => '11:00',
                'visitor_name' => 'Sasha Lim',
                'visitor_email' => 'sasha@example.test',
                'visitor_mobile' => '+60123456789',
                'attendee_count' => 3,
                'refreshment_preference' => 'yes',
                'private_purpose' => 'Project discussion',
            ]);

        $response->assertRedirectToRoute('admin.bookings.index');
        $this->assertDatabaseHas('bookings', [
            'room_id' => $room->id,
            'start_at' => '2026-11-03 10:00:00',
            'end_at' => '2026-11-03 11:00:00',
            'visitor_name' => 'Sasha Lim',
            'refreshment_preference' => 'yes',
        ]);
    }

    public function test_administrators_can_edit_a_booking(): void
    {
        $room = Room::factory()->create();
        $booking = Booking::factory()->for($room)->create([
            'start_at' => '2026-11-03 10:00:00',
            'end_at' => '2026-11-03 11:00:00',
        ]);

        $response = $this->actingAs(User::factory()->create())
            ->put(route('admin.bookings.update', $booking), [
                'room_id' => $room->id,
                'date' => '2026-11-03',
                'start_time' => '10:00',
                'end_time' => '11:00',
                'visitor_name' => 'Aisha Rahman',
                'visitor_email' => 'aisha@example.test',
                'visitor_mobile' => '+60123456789',
                'attendee_count' => 12,
                'refreshment_preference' => 'yes',
                'private_purpose' => 'Quarterly planning',
            ]);

        $response->assertRedirectToRoute('admin.bookings.index');
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'room_id' => $room->id,
            'start_at' => '2026-11-03 10:00:00',
            'end_at' => '2026-11-03 11:00:00',
            'visitor_name' => 'Aisha Rahman',
            'refreshment_preference' => 'yes',
        ]);
    }

    public function test_administrators_notify_visitors_when_a_booking_changes(): void
    {
        $room = Room::factory()->create(['name' => 'Orchid Room']);
        $booking = Booking::factory()->for($room)->create([
            'start_at' => '2026-11-03 10:00:00',
            'end_at' => '2026-11-03 11:00:00',
            'visitor_name' => 'Aisha Rahman',
            'visitor_email' => 'aisha@example.test',
        ]);
        config([
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

        $response = $this->actingAs(User::factory()->create())
            ->put(route('admin.bookings.update', $booking), [
                'room_id' => $room->id,
                'date' => '2026-11-04',
                'start_time' => '14:00',
                'end_time' => '15:00',
                'visitor_name' => 'Aisha Rahman',
                'visitor_email' => 'aisha@example.test',
                'attendee_count' => 12,
                'refreshment_preference' => 'yes',
                'change_reason' => 'An urgent meeting requires this room earlier in the day.',
            ]);

        $response->assertRedirectToRoute('admin.bookings.index');
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'start_at' => '2026-11-04 14:00:00',
            'end_at' => '2026-11-04 15:00:00',
        ]);
        Http::assertSent(static function (Request $request): bool {
            $data = $request->data();
            $content = $data['message']['body']['content'] ?? '';

            return $request->url() === 'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail'
                && $data['message']['subject'] === 'Your room booking has been updated'
                && $data['message']['body']['contentType'] === 'HTML'
                && $data['message']['toRecipients'][0]['emailAddress']['address'] === 'aisha@example.test'
                && str_contains($content, 'Wednesday, 4 November 2026')
                && str_contains($content, 'An urgent meeting requires this room earlier in the day.');
        });
    }

    public function test_administrators_cannot_add_a_booking_that_overlaps_an_existing_booking(): void
    {
        $room = Room::factory()->create();
        Booking::factory()->for($room)->create([
            'start_at' => '2026-11-03 10:00:00',
            'end_at' => '2026-11-03 11:00:00',
        ]);

        $response = $this->actingAs(User::factory()->create())
            ->from(route('admin.bookings.index'))
            ->post(route('admin.bookings.store'), [
                'room_id' => $room->id,
                'date' => '2026-11-03',
                'start_time' => '10:30',
                'end_time' => '11:30',
                'visitor_name' => 'Aisha Rahman',
                'visitor_email' => 'aisha@example.test',
                'attendee_count' => 4,
                'refreshment_preference' => 'yes',
            ]);

        $response->assertRedirect(route('admin.bookings.index'));
        $response->assertSessionHasErrors([
            'end_time' => 'Part of this period is already booked. Please choose another time.',
        ]);
        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_administrators_can_delete_a_booking(): void
    {
        $booking = Booking::factory()->for(Room::factory())->create();

        $response = $this->actingAs(User::factory()->create())
            ->delete(route('admin.bookings.destroy', $booking));

        $response->assertRedirectToRoute('admin.bookings.index');
        $this->assertModelMissing($booking);
    }

    public function test_administrators_notify_visitors_when_a_booking_is_cancelled(): void
    {
        $room = Room::factory()->create(['name' => 'Orchid Room']);
        $booking = Booking::factory()->for($room)->create([
            'start_at' => '2026-11-03 10:00:00',
            'end_at' => '2026-11-03 11:00:00',
            'visitor_name' => 'Aisha Rahman',
            'visitor_email' => 'aisha@example.test',
        ]);
        config([
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

        $response = $this->actingAs(User::factory()->create())
            ->delete(route('admin.bookings.destroy', $booking), [
                'reason' => 'The room is no longer available for this time.',
            ]);

        $response->assertRedirectToRoute('admin.bookings.index');
        $this->assertModelMissing($booking);
        Http::assertSent(static function (Request $request): bool {
            $data = $request->data();
            $content = $data['message']['body']['content'] ?? '';

            return $request->url() === 'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail'
                && $data['message']['subject'] === 'Your room booking has been cancelled'
                && $data['message']['body']['contentType'] === 'HTML'
                && $data['message']['toRecipients'][0]['emailAddress']['address'] === 'aisha@example.test'
                && str_contains($content, 'Tuesday, 3 November 2026')
                && str_contains($content, 'The room is no longer available for this time.');
        });
    }

    public function test_super_admins_are_redirected_to_booking_management_after_login(): void
    {
        $user = User::factory()->superAdmin()->create([
            'email' => 'admin@example.test',
            'password' => Hash::make('secure-password'),
        ]);

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'secure-password',
        ])->assertRedirect(route('admin.bookings.index'));
    }

    public function test_public_registration_is_not_available(): void
    {
        $this->get('/register')->assertNotFound();

    }
}
