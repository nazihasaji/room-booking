<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'room_id',
        'start_at',
        'end_at',
        'visitor_name',
        'visitor_email',
        'visitor_mobile',
        'attendee_count',
        'refreshment_preference',
        'private_purpose',
        'status',
    ];

    /** @var list<string> */
    protected $hidden = [
        'visitor_name',
        'visitor_email',
        'visitor_mobile',
        'attendee_count',
        'refreshment_preference',
        'private_purpose',
    ];

    protected $attributes = [
        'status' => 'confirmed',
    ];

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'attendee_count' => 'integer',
        ];
    }

    /** @return BelongsTo<Room, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    #[Scope]
    protected function confirmed(Builder $query): Builder
    {
        return $query->where('status', 'confirmed');
    }

    #[Scope]
    protected function overlapping(Builder $query, CarbonInterface $startAt, CarbonInterface $endAt): Builder
    {
        return $query
            ->where('start_at', '<', $endAt)
            ->where('end_at', '>', $startAt);
    }
}
