<?php

namespace App\Http\Controllers\Admin;

use App\GraphMailService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DeleteBookingRequest;
use App\Http\Requests\Admin\ManageBookingRequest;
use App\Models\Booking;
use App\Models\Room;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    /**
     * Display private booking management details for super administrators.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'room_ids' => ['nullable', 'array'],
            'room_ids.*' => ['integer', 'distinct', 'exists:rooms,id'],
        ]);

        $bookingQuery = Booking::query()
            ->with('room:id,name')
            ->when($filters['date'] ?? null, fn ($query, string $date) => $query->whereDate('start_at', $date))
            ->when($filters['room_ids'] ?? [], fn ($query, array $roomIds) => $query->whereIn('room_id', $roomIds))
            ->orderByDesc('start_at')
            ->orderByDesc('id');

        $bookingData = fn (Booking $booking): array => [
            'id' => $booking->id,
            'date' => $booking->start_at->toDateString(),
            'start_time' => $booking->start_at->format('H:i'),
            'end_time' => $booking->end_at->format('H:i'),
            'room' => [
                'id' => $booking->room->id,
                'name' => $booking->room->name,
            ],
            'visitor_name' => $booking->visitor_name,
            'visitor_email' => $booking->visitor_email,
            'visitor_mobile' => $booking->visitor_mobile,
            'attendee_count' => $booking->attendee_count,
            'refreshment_preference' => $booking->refreshment_preference,
            'status' => $booking->status,
            'created_at' => $booking->created_at->toIso8601String(),
        ];

        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => (clone $bookingQuery)
                ->paginate(10)
                ->through($bookingData),
            'calendarBookings' => $bookingQuery
                ->get()
                ->map($bookingData)
                ->values(),
            'rooms' => Room::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Room $room): array => ['id' => $room->id, 'name' => $room->name])
                ->values(),
            'filters' => [
                'date' => $filters['date'] ?? null,
                'room_ids' => collect($filters['room_ids'] ?? [])
                    ->map(fn (int|string $roomId): string => (string) $roomId)
                    ->values()
                    ->all(),
            ],
        ]);
    }

    public function store(ManageBookingRequest $request, GraphMailService $graphMailService): RedirectResponse
    {
        $data = $request->validated();
        $times = $this->bookingTimes($data);

        $booking = DB::transaction(function () use ($data, $times): Booking {
            $room = Room::query()->active()->lockForUpdate()->findOrFail($data['room_id']);
            $this->ensureRoomIsAvailable($room, $times['startAt'], $times['endAt']);

            return Booking::query()->create($this->bookingAttributes($data, $room, $times['startAt'], $times['endAt']));
        }, attempts: 3);

        $graphMailService->sendBookingConfirmation($booking);
        $graphMailService->sendAdminBookingNotifications($booking);

        return to_route('admin.bookings.index')->with('success', 'Booking added.');
    }

    public function update(ManageBookingRequest $request, Booking $booking, GraphMailService $graphMailService): RedirectResponse
    {
        $data = $request->validated();
        $times = $this->bookingTimes($data);

        $updatedBooking = DB::transaction(function () use ($booking, $data, $times): Booking {
            $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
            $room = Room::query()->active()->lockForUpdate()->findOrFail($data['room_id']);
            $this->ensureRoomIsAvailable($room, $times['startAt'], $times['endAt'], $lockedBooking);

            $lockedBooking->update($this->bookingAttributes($data, $room, $times['startAt'], $times['endAt'], $lockedBooking));

            return $lockedBooking->refresh();
        }, attempts: 3);

        $graphMailService->sendBookingUpdateNotification($updatedBooking, $data['change_reason'] ?? null);

        return to_route('admin.bookings.index')->with('success', 'Booking updated.');
    }

    public function destroy(DeleteBookingRequest $request, Booking $booking, GraphMailService $graphMailService): RedirectResponse
    {
        $booking->load('room');
        $booking->delete();

        $graphMailService->sendBookingCancellationNotification($booking, $request->validated('reason'));

        return to_route('admin.bookings.index')->with('success', 'Booking deleted.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{startAt: CarbonImmutable, endAt: CarbonImmutable}
     */
    private function bookingTimes(array $data): array
    {
        return [
            'startAt' => CarbonImmutable::createFromFormat('Y-m-d H:i', $data['date'].' '.$data['start_time'], config('app.timezone')),
            'endAt' => CarbonImmutable::createFromFormat('Y-m-d H:i', $data['date'].' '.$data['end_time'], config('app.timezone')),
        ];
    }

    private function ensureRoomIsAvailable(Room $room, CarbonImmutable $startAt, CarbonImmutable $endAt, ?Booking $exceptBooking = null): void
    {
        $isAlreadyBooked = Booking::query()
            ->whereBelongsTo($room)
            ->confirmed()
            ->when($exceptBooking, fn ($query, Booking $booking) => $query->whereKeyNot($booking->id))
            ->overlapping($startAt, $endAt)
            ->exists();

        if ($isAlreadyBooked) {
            throw ValidationException::withMessages([
                'end_time' => 'Part of this period is already booked. Please choose another time.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function bookingAttributes(array $data, Room $room, CarbonImmutable $startAt, CarbonImmutable $endAt, ?Booking $booking = null): array
    {
        return [
            'room_id' => $room->id,
            'start_at' => $startAt,
            'end_at' => $endAt,
            'visitor_name' => $data['visitor_name'],
            'visitor_email' => $data['visitor_email'],
            'visitor_mobile' => $data['visitor_mobile'] ?? null,
            'attendee_count' => $data['attendee_count'],
            'refreshment_preference' => $data['refreshment_preference'],
            'status' => $booking?->status ?? 'confirmed',
        ];
    }
}
