<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Room;
use Illuminate\Http\Request;
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
            'room_id' => ['nullable', 'integer', 'exists:rooms,id'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        $bookings = Booking::query()
            ->with('room:id,name')
            ->when($filters['date'] ?? null, fn ($query, string $date) => $query->whereDate('start_at', $date))
            ->when($filters['room_id'] ?? null, fn ($query, int $roomId) => $query->where('room_id', $roomId))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderBy('start_at')
            ->orderBy('id')
            ->get()
            ->map(fn (Booking $booking): array => [
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
                'private_purpose' => $booking->private_purpose,
                'status' => $booking->status,
                'created_at' => $booking->created_at->toIso8601String(),
            ])
            ->values();

        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $bookings,
            'rooms' => Room::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Room $room): array => ['id' => $room->id, 'name' => $room->name])
                ->values(),
            'filters' => [
                'date' => $filters['date'] ?? null,
                'room_id' => isset($filters['room_id']) ? (string) $filters['room_id'] : '',
                'status' => $filters['status'] ?? '',
            ],
            'statuses' => Booking::query()
                ->select('status')
                ->distinct()
                ->orderBy('status')
                ->pluck('status')
                ->values(),
        ]);
    }
}
