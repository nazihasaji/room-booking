<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_availability_returns_only_rooms_and_unbooked_time_slots(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create(['name' => 'Orchid Room']);
        Booking::factory()->for($room)->create([
            'start_at' => '2026-10-10 10:00:00',
            'end_at' => '2026-10-10 12:00:00',
            'visitor_name' => 'Private Visitor',
            'visitor_email' => 'private@example.com',
            'visitor_mobile' => '+60111111111',
            'private_purpose' => 'Private board planning',
        ]);

        $response = $this->getJson(route('bookings.availability', ['date' => '2026-10-10']));

        $response->assertExactJson([
            'date' => '2026-10-10',
            'rooms' => [[
                'id' => $room->id,
                'name' => 'Orchid Room',
                'time_slots' => [
                    ['start' => '08:30', 'end' => '09:00'],
                    ['start' => '09:00', 'end' => '09:30'],
                    ['start' => '09:30', 'end' => '10:00'],
                    ['start' => '12:00', 'end' => '12:30'],
                    ['start' => '12:30', 'end' => '13:00'],
                    ['start' => '13:00', 'end' => '13:30'],
                    ['start' => '13:30', 'end' => '14:00'],
                    ['start' => '14:00', 'end' => '14:30'],
                    ['start' => '14:30', 'end' => '15:00'],
                    ['start' => '15:00', 'end' => '15:30'],
                    ['start' => '15:30', 'end' => '16:00'],
                    ['start' => '16:00', 'end' => '16:30'],
                    ['start' => '16:30', 'end' => '17:00'],
                    ['start' => '17:00', 'end' => '17:30'],
                    ['start' => '17:30', 'end' => '18:00'],
                ],
            ]],
        ]);
        $this->assertStringNotContainsString('Private Visitor', $response->getContent());
        $this->assertStringNotContainsString('Private board planning', $response->getContent());
    }

    public function test_a_visitor_can_book_an_available_slot_without_a_private_purpose(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create();

        $response = $this->post(route('bookings.store'), [
            'room_id' => $room->id,
            'date' => '2026-10-10',
            'start_time' => '17:30',
            'end_time' => '18:00',
            'visitor_name' => 'Amina Ismail',
            'visitor_email' => 'amina@example.com',
            'attendee_count' => 12,
            'refreshment_preference' => 'yes',
        ]);

        $response->assertRedirectToRoute('bookings.index');
        $this->assertDatabaseHas('bookings', [
            'room_id' => $room->id,
            'start_at' => '2026-10-10 17:30:00',
            'end_at' => '2026-10-10 18:00:00',
            'visitor_name' => 'Amina Ismail',
            'visitor_email' => 'amina@example.com',
            'visitor_mobile' => null,
            'attendee_count' => 12,
            'refreshment_preference' => 'yes',
            'private_purpose' => null,
            'status' => 'confirmed',
        ]);
    }

    public function test_a_booking_confirmation_is_sent_through_microsoft_graph_when_configured(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create(['name' => 'Orchid Room']);
        $administrator = User::factory()->create(['email' => 'admin@example.com']);
        $superAdministrator = User::factory()->superAdmin()->create(['email' => 'super-admin@example.com']);
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

        $response = $this->post(route('bookings.store'), [
            'room_id' => $room->id,
            'date' => '2026-10-10',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'visitor_name' => 'Amina Ismail',
            'visitor_email' => 'amina@example.com',
            'attendee_count' => 12,
            'refreshment_preference' => 'yes',
        ]);

        $response->assertRedirectToRoute('bookings.index');
        $this->assertDatabaseHas('bookings', [
            'room_id' => $room->id,
            'visitor_email' => 'amina@example.com',
        ]);
        Http::assertSent(static fn (Request $request): bool => $request->url() === 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token'
            && $request->method() === 'POST'
            && $request->data() === [
                'client_id' => 'client-id',
                'client_secret' => 'client-secret',
                'scope' => 'https://graph.microsoft.com/.default',
                'grant_type' => 'client_credentials',
            ]);
        Http::assertSent(static fn (Request $request): bool => $request->url() === 'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail'
            && $request->method() === 'POST'
            && $request->data() === [
                'message' => [
                    'subject' => 'Room booking confirmation',
                    'body' => [
                        'contentType' => 'HTML',
                        'content' => view('emails.booking-confirmation', [
                            'visitorName' => 'Amina Ismail',
                            'roomName' => 'Orchid Room',
                            'bookingDate' => 'Saturday, 10 October 2026',
                            'bookingTime' => '9:00 am – 10:00 am',
                            'senderName' => 'Room Booking',
                        ])->render(),
                    ],
                    'toRecipients' => [[
                        'emailAddress' => [
                            'address' => 'amina@example.com',
                        ],
                    ]],
                ],
            ]);
        Http::assertSent(static fn (Request $request): bool => $request->url() === 'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail'
            && $request->data() === [
                'message' => [
                    'subject' => 'New room booking',
                    'body' => [
                        'contentType' => 'HTML',
                        'content' => view('emails.admin-booking-notification', [
                            'roomName' => 'Orchid Room',
                            'bookingDate' => 'Saturday, 10 October 2026',
                            'bookingTime' => '9:00 am – 10:00 am',
                            'senderName' => 'Room Booking',
                        ])->render(),
                    ],
                    'toRecipients' => [[
                        'emailAddress' => [
                            'address' => $administrator->email,
                        ],
                    ]],
                ],
            ]);
        Http::assertNotSent(static fn (Request $request): bool => $request->url() === 'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail'
            && ($request->data()['message']['toRecipients'][0]['emailAddress']['address'] ?? null) === $superAdministrator->email);
    }

    public function test_a_booking_succeeds_when_microsoft_graph_cannot_send_its_confirmation(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create();
        config([
            'services.graph.tenant_id' => 'tenant-id',
            'services.graph.client_id' => 'client-id',
            'services.graph.client_secret' => 'client-secret',
            'services.graph.from_address' => 'bookings@example.com',
        ]);
        Http::preventStrayRequests();
        Http::fake([
            'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token' => Http::response([
                'access_token' => 'graph-access-token',
            ]),
            'https://graph.microsoft.com/v1.0/users/bookings%40example.com/sendMail' => Http::response(status: 500),
        ]);

        $response = $this->post(route('bookings.store'), [
            'room_id' => $room->id,
            'date' => '2026-10-10',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'visitor_name' => 'Amina Ismail',
            'visitor_email' => 'amina@example.com',
            'attendee_count' => 12,
            'refreshment_preference' => 'yes',
        ]);

        $response->assertRedirectToRoute('bookings.index');
        $this->assertDatabaseHas('bookings', [
            'room_id' => $room->id,
            'visitor_email' => 'amina@example.com',
        ]);
        Http::assertSentCount(2);
    }

    public function test_a_booking_requires_a_visitor_email_address(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create();

        $response = $this->from(route('bookings.index'))->post(route('bookings.store'), [
            'room_id' => $room->id,
            'date' => '2026-10-10',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'visitor_name' => 'Amina Ismail',
            'attendee_count' => 12,
            'refreshment_preference' => 'yes',
        ]);

        $response->assertRedirect(route('bookings.index'));
        $response->assertSessionHasErrors('visitor_email');
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_a_booking_requires_a_yes_or_no_refreshment_choice(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create();

        $response = $this->from(route('bookings.index'))->post(route('bookings.store'), [
            'room_id' => $room->id,
            'date' => '2026-10-10',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'visitor_name' => 'Amina Ismail',
            'visitor_email' => 'amina@example.com',
            'attendee_count' => 12,
            'refreshment_preference' => 'coffee',
        ]);

        $response->assertRedirect(route('bookings.index'));
        $response->assertSessionHasErrors('refreshment_preference');
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_a_booking_is_rejected_when_its_slot_overlaps_an_existing_booking(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create();
        Booking::factory()->for($room)->create([
            'start_at' => '2026-10-10 09:00:00',
            'end_at' => '2026-10-10 10:00:00',
        ]);

        $response = $this->from(route('bookings.index'))->post(route('bookings.store'), [
            'room_id' => $room->id,
            'date' => '2026-10-10',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'visitor_name' => 'Amina Ismail',
            'visitor_email' => 'amina@example.com',
            'visitor_mobile' => '+60123456789',
            'attendee_count' => 2,
            'refreshment_preference' => 'yes',
            'private_purpose' => 'A private purpose',
        ]);

        $response->assertRedirect(route('bookings.index'));
        $response->assertSessionHasErrors([
            'end_time' => 'Part of this period was just booked. Please choose another time.',
        ]);
        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_a_booking_requires_an_end_time_after_its_start_time(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create();

        $response = $this->from(route('bookings.index'))->post(route('bookings.store'), [
            'room_id' => $room->id,
            'date' => '2026-10-10',
            'start_time' => '12:00',
            'end_time' => '10:00',
            'visitor_name' => 'Amina Ismail',
            'visitor_email' => 'amina@example.com',
            'attendee_count' => 2,
            'refreshment_preference' => 'no',
        ]);

        $response->assertRedirect(route('bookings.index'));
        $response->assertSessionHasErrors([
            'end_time' => 'Choose an end time after the start time.',
        ]);
        $this->assertDatabaseCount('bookings', 0);
    }
}
