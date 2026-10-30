<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $openingHour = (int) config('booking.opening_hour');
        $closingHour = (int) config('booking.closing_hour');
        $startTimes = array_map(
            fn (int $hour): string => sprintf('%02d:00', $hour),
            range($openingHour, $closingHour - 1),
        );
        $endTimes = array_map(
            fn (int $hour): string => sprintf('%02d:00', $hour),
            range($openingHour + 1, $closingHour),
        );

        return [
            'room_id' => ['required', 'integer', Rule::exists('rooms', 'id')->where('is_active', true)],
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i', Rule::in($startTimes)],
            'end_time' => ['required', 'date_format:H:i', Rule::in($endTimes)],
            'visitor_name' => ['required', 'string', 'max:255'],
            'visitor_email' => ['nullable', 'email', 'max:255'],
            'visitor_mobile' => ['nullable', 'string', 'regex:/^[0-9+() -]{7,30}$/'],
            'attendee_count' => ['required', 'integer', 'min:1', 'max:500'],
            'refreshment_preference' => ['required', Rule::in(['none', 'coffee', 'tea'])],
            'private_purpose' => ['nullable', 'string', 'max:500'],
        ];
    }

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
