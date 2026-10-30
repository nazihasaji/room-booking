<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Room;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingAvailabilityController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
        ]);

        $date = CarbonImmutable::createFromFormat(
            'Y-m-d',
            $validated['date'],
            config('app.timezone'),
        )->startOfDay();
        $dayEnd = $date->addDay();
        $slotStarts = collect(range(
            (int) config('booking.opening_hour'),
            (int) config('booking.closing_hour') - 1,
        ))->map(fn (int $hour): CarbonImmutable => $date->setTime($hour, 0));

        $rooms = Room::query()
            ->active()
            ->orderBy('name')
            ->with(['bookings' => fn ($query) => $query
                ->select(['id', 'room_id', 'start_at', 'end_at'])
                ->confirmed()
                ->overlapping($date, $dayEnd)])
            ->get(['id', 'name']);

        return response()->json([
            'date' => $date->toDateString(),
            'rooms' => $rooms->map(fn (Room $room): array => [
                'id' => $room->id,
                'name' => $room->name,
                'time_slots' => $slotStarts
                    ->filter(fn (CarbonImmutable $startAt): bool => $room->bookings
                        ->doesntContain(fn (Booking $booking): bool => $booking->start_at->lt($startAt->addHour())
                            && $booking->end_at->gt($startAt)))
                    ->map(fn (CarbonImmutable $startAt): array => [
                        'start' => $startAt->format('H:i'),
                        'end' => $startAt->addHour()->format('H:i'),
                    ])
                    ->values()
                    ->all(),
            ]),
        ]);
    }
}
