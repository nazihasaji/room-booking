<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startAt = now()->addDay()->setTime(9, 0);

        return [
            'room_id' => Room::factory(),
            'start_at' => $startAt,
            'end_at' => $startAt->copy()->addHour(),
            'visitor_name' => fake()->name(),
            'visitor_email' => fake()->safeEmail(),
            'visitor_mobile' => '+60123456789',
            'attendee_count' => fake()->numberBetween(1, 20),
            'refreshment_preference' => 'none',
            'private_purpose' => fake()->sentence(),
            'status' => 'confirmed',
        ];
    }
}
