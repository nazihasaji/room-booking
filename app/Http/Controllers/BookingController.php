<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Room;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Bookings/Index', [
            'rooms' => Room::query()
                ->active()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function store(StoreBookingRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $startAt = CarbonImmutable::createFromFormat(
            'Y-m-d H:i',
            $data['date'].' '.$data['start_time'],
            config('app.timezone'),
        );
        $endAt = CarbonImmutable::createFromFormat(
            'Y-m-d H:i',
            $data['date'].' '.$data['end_time'],
            config('app.timezone'),
        );

        DB::transaction(function () use ($data, $startAt, $endAt): void {
            $room = Room::query()->active()->lockForUpdate()->findOrFail($data['room_id']);

            $isAlreadyBooked = Booking::query()
                ->whereBelongsTo($room)
                ->confirmed()
                ->overlapping($startAt, $endAt)
                ->exists();

            if ($isAlreadyBooked) {
                throw ValidationException::withMessages([
                    'end_time' => 'Part of this period was just booked. Please choose another time.',
                ]);
            }

            Booking::query()->create([
                'room_id' => $room->id,
                'start_at' => $startAt,
                'end_at' => $endAt,
                'visitor_name' => $data['visitor_name'],
                'visitor_email' => $data['visitor_email'] ?? null,
                'visitor_mobile' => $data['visitor_mobile'] ?? null,
                'attendee_count' => $data['attendee_count'],
                'refreshment_preference' => $data['refreshment_preference'],
                'private_purpose' => $data['private_purpose'] ?? null,
                'status' => 'confirmed',
            ]);
        }, attempts: 3);

        return to_route('bookings.index')->with('success', 'Your room has been booked.');
    }
}
