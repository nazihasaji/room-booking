<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ManageBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $openingMinute = (int) config('booking.opening_minute');
        $closingMinute = (int) config('booking.closing_minute');
        $slotMinutes = (int) config('booking.slot_minutes');
        $startTimes = array_map(
            fn (int $minutes): string => sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60),
            range($openingMinute, $closingMinute - $slotMinutes, $slotMinutes),
        );
        $endTimes = array_map(
            fn (int $minutes): string => sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60),
            range($openingMinute + $slotMinutes, $closingMinute, $slotMinutes),
        );

        return [
            'room_id' => ['required', 'integer', Rule::exists('rooms', 'id')->where('is_active', true)],
            'date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i', Rule::in($startTimes)],
            'end_time' => ['required', 'date_format:H:i', Rule::in($endTimes)],
            'visitor_name' => ['required', 'string', 'max:255'],
            'visitor_email' => ['required', 'email', 'max:255'],
            'visitor_mobile' => ['nullable', 'string', 'regex:/^[0-9+() -]{7,30}$/'],
            'attendee_count' => ['required', 'integer', 'min:1', 'max:500'],
            'refreshment_preference' => ['required', Rule::in(['yes', 'no'])],
            'private_purpose' => ['nullable', 'string', 'max:500'],
            'change_reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['start_time', 'end_time'])) {
                    return;
                }

                if ($this->string('end_time')->toString() <= $this->string('start_time')->toString()) {
                    $validator->errors()->add('end_time', 'Choose an end time after the start time.');
                }
            },
        ];
    }
}
