<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    public function test_authenticated_users_without_super_admin_access_are_forbidden(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.bookings.index'))
            ->assertForbidden();
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

    public function test_super_admins_can_see_private_booking_details(): void
    {
        $room = Room::factory()->create(['name' => 'Private room']);
        $booking = Booking::factory()->for($room)->create([
            'visitor_name' => 'Aisha Rahman',
            'visitor_email' => 'aisha@example.test',
            'visitor_mobile' => '+60123456789',
            'attendee_count' => 12,
            'refreshment_preference' => 'tea',
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
                ->where('bookings.data.0.refreshment_preference', 'tea')
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
