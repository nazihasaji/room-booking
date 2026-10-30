<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
                    ['start' => '09:00', 'end' => '10:00'],
                    ['start' => '12:00', 'end' => '13:00'],
                    ['start' => '13:00', 'end' => '14:00'],
                    ['start' => '14:00', 'end' => '15:00'],
                    ['start' => '15:00', 'end' => '16:00'],
                    ['start' => '16:00', 'end' => '17:00'],
                ],
            ]],
        ]);
        $this->assertStringNotContainsString('Private Visitor', $response->getContent());
        $this->assertStringNotContainsString('Private board planning', $response->getContent());
    }

    public function test_a_visitor_can_book_an_available_slot(): void
    {
        $this->travelTo('2026-10-01 08:00:00');
        $room = Room::factory()->create();

        $response = $this->post(route('bookings.store'), [
            'room_id' => $room->id,
            'date' => '2026-10-10',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'visitor_name' => 'Amina Ismail',
            'attendee_count' => 12,
            'refreshment_preference' => 'coffee',
            'private_purpose' => 'Team planning',
        ]);

        $response->assertRedirectToRoute('bookings.index');
        $this->assertDatabaseHas('bookings', [
            'room_id' => $room->id,
            'start_at' => '2026-10-10 09:00:00',
            'end_at' => '2026-10-10 17:00:00',
            'visitor_name' => 'Amina Ismail',
            'visitor_email' => null,
            'visitor_mobile' => null,
            'attendee_count' => 12,
            'refreshment_preference' => 'coffee',
            'status' => 'confirmed',
        ]);
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
            'refreshment_preference' => 'tea',
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
            'refreshment_preference' => 'none',
        ]);

        $response->assertRedirect(route('bookings.index'));
        $response->assertSessionHasErrors([
            'end_time' => 'Choose an end time after the start time.',
        ]);
        $this->assertDatabaseCount('bookings', 0);
    }
}
