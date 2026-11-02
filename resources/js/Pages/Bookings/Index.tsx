import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { availability, store } from '@/routes/bookings';

type Room = {
    id: number;
    name: string;
};

type TimeSlot = {
    start: string;
    end: string;
};

type AvailabilityRoom = Room & {
    time_slots: TimeSlot[];
};

type Availability = {
    date: string;
    rooms: AvailabilityRoom[];
};

type BookingPageProps = {
    rooms: Room[];
    flash?: {
        success?: string;
    };
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const bookableTimeSlots: TimeSlot[] = Array.from({ length: 8 }, (_, index) => {
    const startHour = String(index + 9).padStart(2, '0');
    const endHour = String(index + 10).padStart(2, '0');

    return {
        start: `${startHour}:00`,
        end: `${endHour}:00`,
    };
});

function dateKey(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-MY', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatTime(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    const date = new Date(2000, 0, 1, hour, minute);

    return new Intl.DateTimeFormat('en-MY', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

export default function Index({ rooms, flash }: BookingPageProps) {
    const today = useMemo(() => new Date(), []);
    const [visibleMonth, setVisibleMonth] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1),
    );
    const [selectedDate, setSelectedDate] = useState(dateKey(today));
    const [availabilityData, setAvailabilityData] = useState<Availability>();
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
    const [availabilityError, setAvailabilityError] = useState<string>();
    const { data, setData, post, processing, errors, reset } = useForm({
        room_id: rooms[0]?.id ?? 0,
        date: dateKey(today),
        start_time: '',
        end_time: '',
        visitor_name: '',
        visitor_email: '',
        visitor_mobile: '',
        attendee_count: 1,
        refreshment_preference: 'none',
        private_purpose: '',
    });

    async function loadAvailability(date: string): Promise<void> {
        setIsLoadingAvailability(true);
        setAvailabilityError(undefined);

        try {
            const response = await fetch(
                availability.url({ query: { date } }),
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) {
                throw new Error('Unable to load available times.');
            }

            setAvailabilityData((await response.json()) as Availability);
        } catch {
            setAvailabilityError('Unable to load available times. Please try again.');
        } finally {
            setIsLoadingAvailability(false);
        }
    }

    useEffect(() => {
        setData('date', selectedDate);
        setData('start_time', '');
        setData('end_time', '');
        void loadAvailability(selectedDate);
    }, [selectedDate]);

    const selectedRoom = availabilityData?.rooms.find(
        (room) => room.id === data.room_id,
    );
    const availableSlots = selectedRoom?.time_slots ?? [];
    const availableEndTimes = useMemo(() => {
        const selectedSlotIndex = availableSlots.findIndex(
            (slot) => slot.start === data.start_time,
        );

        if (selectedSlotIndex === -1) {
            return [];
        }

        const endTimes = [availableSlots[selectedSlotIndex].end];

        for (let index = selectedSlotIndex + 1; index < availableSlots.length; index += 1) {
            if (availableSlots[index - 1].end !== availableSlots[index].start) {
                break;
            }

            endTimes.push(availableSlots[index].end);
        }

        return endTimes;
    }, [availableSlots, data.start_time]);
    const monthDays = useMemo(() => {
        const firstDay = new Date(
            visibleMonth.getFullYear(),
            visibleMonth.getMonth(),
            1,
        );
        const calendarStart = new Date(firstDay);
        calendarStart.setDate(1 - firstDay.getDay());

        return Array.from({ length: 42 }, (_, index) => {
            const day = new Date(calendarStart);
            day.setDate(calendarStart.getDate() + index);

            return day;
        });
    }, [visibleMonth]);

    function chooseDate(date: Date): void {
        if (dateKey(date) < dateKey(today)) {
            return;
        }

        setSelectedDate(dateKey(date));
    }

    function chooseStartTime(startTime: string): void {
        const selectedSlot = availableSlots.find((slot) => slot.start === startTime);

        setData('start_time', startTime);
        setData('end_time', selectedSlot?.end ?? '');
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        post(store.url(), {
            onSuccess: () => {
                reset(
                    'start_time',
                    'end_time',
                    'visitor_name',
                    'visitor_email',
                    'visitor_mobile',
                    'attendee_count',
                    'refreshment_preference',
                    'private_purpose',
                );
                void loadAvailability(selectedDate);
            },
        });
    }

    return (
        <main className="min-h-screen bg-base-200 text-base-content">
            <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
                <header className="mb-6 flex flex-col gap-5 border-b border-base-300 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Room Reserve</p>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book a room</h1>
                        <p className="mt-2 max-w-xl text-base-content/65">Choose a date, room, start time, and end time. No account is needed.</p>
                    </div>
                </header>

                {flash?.success && (
                    <div className="alert mb-6 border border-emerald-200 bg-emerald-100 text-emerald-800" role="status">
                        {flash.success}
                    </div>
                )}

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.7fr)_minmax(320px,0.8fr)] xl:items-start">
                    <section className="card border border-base-300 bg-base-100 shadow-sm"><div className="card-body p-5">
                        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Calendar</h2>
                                <p className="mt-1 text-sm text-base-content/65">Select a date to see the times that remain available.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="btn btn-sm btn-outline" aria-label="Previous month">‹</button>
                                <button type="button" onClick={() => setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))} className="btn btn-sm btn-outline">Today</button>
                                <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="btn btn-sm btn-outline" aria-label="Next month">›</button>
                            </div>
                        </div>

                        <h3 className="mb-4 text-center text-lg font-semibold">
                            {new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' }).format(visibleMonth)}
                        </h3>
                        <div className="grid grid-cols-7 border-l border-t border-slate-200">
                            {weekdays.map((day) => <div key={day} className="border-b border-r border-slate-200 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">{day}</div>)}
                            {monthDays.map((date) => {
                                const key = dateKey(date);
                                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                                const isSelected = key === selectedDate;
                                const isPast = key < dateKey(today);

                                return (
                                    <button key={key} type="button" disabled={isPast} onClick={() => chooseDate(date)} className={`min-h-16 border-b border-r border-slate-200 p-2 text-right transition sm:min-h-20 ${isSelected ? 'bg-red-50' : 'hover:bg-slate-50'} ${!isCurrentMonth || isPast ? 'text-slate-300' : 'text-slate-700'} disabled:cursor-not-allowed`}>
                                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isSelected ? 'bg-red-700 text-white' : ''}`}>{date.getDate()}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div></section>

                    <section className="card border border-base-300 bg-base-100 shadow-sm"><div className="card-body p-5">
                            <h2 className="text-xl font-bold">{formatDate(new Date(`${selectedDate}T00:00:00`))}</h2>
                            <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-600" aria-label="Time availability legend"><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-slate-300 bg-white" />Available</span><span className="inline-flex items-center gap-1.5"><span className="relative size-3 overflow-hidden rounded" style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }}><svg aria-hidden="true" viewBox="0 0 12 12" preserveAspectRatio="none" className="absolute inset-0 size-full text-error"><line x1="0" y1="12" x2="12" y2="0" stroke="currentColor" strokeWidth="2" /></svg></span>Unavailable</span></div>
                            <div className="mt-5">
                                <label htmlFor="room" className="text-sm font-semibold text-slate-700">Room</label>
                                <select id="room" value={data.room_id} onChange={(event) => { setData('room_id', Number(event.target.value)); setData('start_time', ''); setData('end_time', ''); }} className="select select-bordered mt-2 w-full focus:select-primary">
                                    {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                                </select>
                            </div>
                            <div className="mt-5">
                                <p className="text-sm font-semibold text-slate-700">Start times</p>
                                {isLoadingAvailability ? (
                                    <div className="mt-3 grid grid-cols-2 gap-2 animate-pulse"><div className="h-10 rounded-lg bg-slate-100" /><div className="h-10 rounded-lg bg-slate-100" /></div>
                                ) : availabilityError ? (
                                    <p className="mt-3 text-sm text-red-700">{availabilityError}</p>
                                ) : (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {bookableTimeSlots.map((slot) => {
                                            const isAvailable = availableSlots.some(
                                                (availableSlot) => availableSlot.start === slot.start,
                                            );

                                            return <button key={slot.start} type="button" disabled={!isAvailable} onClick={() => chooseStartTime(slot.start)} className={`btn btn-sm relative overflow-hidden ${!isAvailable ? 'opacity-100 disabled:opacity-100' : data.start_time === slot.start ? 'btn-primary' : 'btn-outline'}`} style={!isAvailable ? { backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#b91c1c', opacity: 1 } : undefined} aria-label={`${formatTime(slot.start)}${isAvailable ? ', available' : ', unavailable'}`}><span className="relative z-10">{formatTime(slot.start)}</span>{!isAvailable && <svg aria-hidden="true" viewBox="0 0 100 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full text-error"><line x1="0" y1="40" x2="100" y2="0" stroke="currentColor" strokeWidth="3" /></svg>}</button>;
                                        })}
                                    </div>
                                )}
                            </div>
                    </div></section>

                    <form onSubmit={submit} className="card border border-base-300 bg-base-100 shadow-sm"><div className="card-body p-5">
                            <h2 className="text-xl font-bold">Book this slot</h2>
                            <p className="mt-1 text-sm text-slate-600">Your details and purpose are stored privately.</p>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold">Date:</span> {formatDate(new Date(`${selectedDate}T00:00:00`))}</div>
                                <Field label="Time" error={errors.start_time ?? errors.end_time}><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"><select value={data.start_time} onChange={(event) => chooseStartTime(event.target.value)} className="field"><option value="">From</option>{availableSlots.map((slot) => <option key={slot.start} value={slot.start}>{formatTime(slot.start)}</option>)}</select><span className="text-sm text-slate-500">to</span><select value={data.end_time} onChange={(event) => setData('end_time', event.target.value)} disabled={!data.start_time} className="field disabled:cursor-not-allowed disabled:bg-slate-100">{!data.start_time && <option value="">To</option>}{availableEndTimes.map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}</select></div><span className="mt-2 block text-xs font-normal text-slate-500">Only uninterrupted end times are offered.</span></Field>
                                <Field label="Your name" error={errors.visitor_name}><input value={data.visitor_name} onChange={(event) => setData('visitor_name', event.target.value)} className="field" autoComplete="name" /></Field>
                                <Field label="Email address (optional)" error={errors.visitor_email}><input type="email" value={data.visitor_email} onChange={(event) => setData('visitor_email', event.target.value)} className="field" autoComplete="email" /></Field>
                                <Field label="Mobile number (optional)" error={errors.visitor_mobile}><input type="tel" value={data.visitor_mobile} onChange={(event) => setData('visitor_mobile', event.target.value)} className="field" autoComplete="tel" /></Field>
                                <Field label="No. of attendees" error={errors.attendee_count}><input type="number" min="1" max="500" value={data.attendee_count} onChange={(event) => setData('attendee_count', Number(event.target.value))} className="field" /></Field>
                                <Field label="Need coffee or tea?" error={errors.refreshment_preference}><select value={data.refreshment_preference} onChange={(event) => setData('refreshment_preference', event.target.value)} className="field"><option value="none">No refreshments</option><option value="coffee">Coffee</option><option value="tea">Tea</option></select></Field>
                                <Field label="Purpose (private)" error={errors.private_purpose}><textarea value={data.private_purpose} onChange={(event) => setData('private_purpose', event.target.value)} className="field min-h-20 resize-y" maxLength={500} /></Field>
                                <button type="submit" disabled={processing || !data.end_time} className="btn btn-primary w-full">{processing ? 'Booking…' : 'Book a slot'}</button>
                            </div>
                    </div></form>
                </div>
            </div>
        </main>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return <label className="block text-sm font-semibold"><span className="label-text">{label}</span><div className="mt-1">{children}</div>{error && <span className="mt-1 block text-sm font-normal text-error">{error}</span>}</label>;
}
