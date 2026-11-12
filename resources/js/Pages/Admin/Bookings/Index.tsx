import { Head, router, useForm } from '@inertiajs/react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useModalScrollLock } from '@/Components/Modal';
import { destroy, store, update } from '@/actions/App/Http/Controllers/Admin/BookingController';
import { index } from '@/routes/admin/bookings';
import { availability } from '@/routes/bookings';

type Room = { id: number; name: string };
type TimeSlot = { start: string; end: string };
type Availability = { date: string; rooms: Array<Room & { time_slots: TimeSlot[] }> };
type Booking = {
    id: number;
    date: string;
    start_time: string;
    end_time: string;
    room: Room;
    visitor_name: string;
    visitor_email: string | null;
    visitor_mobile: string | null;
    attendee_count: number;
    refreshment_preference: string;
    status: string;
    created_at: string;
};
type CalendarBooking = Booking & { lane: number; laneCount: number };
type Filters = { date: string | null; room_ids: string[] };
type BookingPaginator = { data: Booking[]; current_page: number; last_page: number; per_page: number; from: number | null; to: number | null; total: number };
type BookingManagementProps = { bookings: BookingPaginator; calendarBookings: Booking[]; rooms: Room[]; filters: Filters; flash?: { success?: string } };
type RoomColour = { dot: string; booking: string };

const roomColours: RoomColour[] = [
    { dot: 'bg-blue-600', booking: 'border-blue-700 bg-blue-600 text-white hover:bg-blue-700' },
    { dot: 'bg-red-600', booking: 'border-red-700 bg-red-600 text-white hover:bg-red-700' },
    { dot: 'bg-amber-700', booking: 'border-amber-800 bg-amber-700 text-white hover:bg-amber-800' },
    { dot: 'bg-violet-700', booking: 'border-violet-800 bg-violet-700 text-white hover:bg-violet-800' },
    { dot: 'bg-slate-600', booking: 'border-slate-700 bg-slate-600 text-white hover:bg-slate-700' },
    { dot: 'bg-pink-700', booking: 'border-pink-800 bg-pink-700 text-white hover:bg-pink-800' },
    { dot: 'bg-lime-600', booking: 'border-lime-700 bg-lime-600 text-slate-950 hover:bg-lime-700' },
];
const calendarStartMinute = (8 * 60) + 30;
const calendarEndMinute = 18 * 60;
const calendarHours = Array.from({ length: 20 }, (_, index) => calendarStartMinute + (index * 30));
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const startTimes = Array.from({ length: 19 }, (_, index) => {
    const totalMinutes = (8 * 60) + 30 + (index * 30);

    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
});
const endTimes = startTimes.map((time, index) => index === startTimes.length - 1 ? '18:00' : startTimes[index + 1]);

function formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

function formatTime(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    return new Intl.DateTimeFormat('en-MY', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, minute));
}

function formatTimeFromMinutes(minutes: number): string {
    return formatTime(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
}

function formatCreatedAt(createdAt: string): string {
    return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(createdAt));
}

function formatPickerDate(date: string): string {
    if (date === '') {
        return 'Select date';
    }

    return new Intl.DateTimeFormat('en-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parseDate(date));
}

type DropdownOption = { value: string; label: string };

function Dropdown({ value, options, placeholder, label, disabled = false, onChange }: { value: string; options: DropdownOption[]; placeholder: string; label: string; disabled?: boolean; onChange: (value: string) => void }) {
    const selectedOption = options.find((option) => option.value === value);

    return <Listbox value={value} onChange={onChange} disabled={disabled}><div className="relative"><ListboxButton aria-label={label} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-base-300 bg-base-100 px-3 text-left text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-base-200 disabled:text-base-content/45"><span className={selectedOption ? '' : 'text-base-content/45'}>{selectedOption?.label ?? placeholder}</span><svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-current text-base-content/60"><path d="m5.25 7.5 4.75 4.75 4.75-4.75H5.25Z" /></svg></ListboxButton><ListboxOptions className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg outline-none">{options.map((option) => <ListboxOption key={option.value} value={option.value} className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[focus]:bg-red-50 data-[focus]:text-red-800 data-[selected]:bg-primary data-[selected]:text-primary-content">{option.label}</ListboxOption>)}</ListboxOptions></div></Listbox>;
}

function MultiRoomDropdown({ rooms, value = [], onChange }: { rooms: Room[]; value?: string[]; onChange: (roomIds: string[]) => void }) {
    const label = value.length === 0 ? 'All rooms' : value.length === 1 ? '1 room selected' : `${value.length} rooms selected`;

    return <Listbox value={value} onChange={onChange} multiple><div className="relative"><ListboxButton aria-label="Filter by rooms" className="flex min-h-11 w-full items-center justify-between rounded-lg border border-base-300 bg-base-100 px-3 text-left text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"><span>{label}</span><svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-current text-base-content/60"><path d="m5.25 7.5 4.75 4.75 4.75-4.75H5.25Z" /></svg></ListboxButton><ListboxOptions className="absolute z-50 mt-1 w-72 overflow-hidden rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg outline-none"><div className="border-b border-base-300 px-3 py-2 text-xs font-semibold text-base-content/60">Choose one or more rooms</div>{rooms.map((room) => <ListboxOption key={room.id} value={String(room.id)} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[focus]:bg-red-50 data-[focus]:text-red-800 data-[selected]:bg-red-50">{({ selected }) => <><input type="checkbox" checked={selected} readOnly className="checkbox checkbox-sm checkbox-primary pointer-events-none" /><span>{room.name}</span></>}</ListboxOption>)}{value.length > 0 && <button type="button" onClick={() => onChange([])} className="m-1 w-[calc(100%-0.5rem)] rounded-md px-2 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50">Clear room selection</button>}</ListboxOptions></div></Listbox>;
}

function DatePicker({ value, label, onChange }: { value: string; label: string; onChange: (date: string) => void }) {
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const selectedDate = value === '' ? new Date() : parseDate(value);

        return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    });
    const days = useMemo(() => {
        const calendarStart = new Date(visibleMonth);
        calendarStart.setDate(1 - calendarStart.getDay());

        return Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
    }, [visibleMonth]);

    useEffect(() => {
        if (value === '') {
            return;
        }

        const selectedDate = parseDate(value);
        setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }, [value]);

    return <Popover className="relative">{({ close }) => <><PopoverButton aria-label={label} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-base-300 bg-base-100 px-3 text-left text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"><span className={value === '' ? 'text-base-content/45' : ''}>{formatPickerDate(value)}</span><svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-current text-base-content/60"><path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.75A2.25 2.25 0 0 1 18 6.25v9.5A2.25 2.25 0 0 1 15.75 18h-11A2.25 2.25 0 0 1 2.5 15.75v-9.5A2.25 2.25 0 0 1 4.75 4h.25V2.75A.75.75 0 0 1 5.75 2ZM4 8v7.75c0 .414.336.75.75.75h11a.75.75 0 0 0 .75-.75V8H4Z" clipRule="evenodd" /></svg></PopoverButton><PopoverPanel className="absolute left-0 z-50 mt-1 w-72 rounded-xl border border-base-300 bg-base-100 p-3 shadow-lg"><div className="mb-3 flex items-center justify-between gap-2"><button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="btn btn-ghost btn-sm btn-square" aria-label="Previous month">‹</button><p className="text-sm font-bold">{new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' }).format(visibleMonth)}</p><button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="btn btn-ghost btn-sm btn-square" aria-label="Next month">›</button></div><div className="grid grid-cols-7 gap-1 text-center text-xs">{weekdays.map((weekday) => <span key={weekday} className="py-1 font-bold uppercase text-base-content/50">{weekday.slice(0, 1)}</span>)}{days.map((day) => { const key = dateKey(day); const isCurrentMonth = day.getMonth() === visibleMonth.getMonth(); const isSelected = key === value; return <button key={key} type="button" onClick={() => { onChange(key); close(); }} className={`aspect-square rounded-md text-sm font-medium transition ${isSelected ? 'bg-primary text-primary-content' : isCurrentMonth ? 'hover:bg-red-50 hover:text-red-800' : 'text-base-content/35 hover:bg-base-200'}`}>{day.getDate()}</button>; })}</div></PopoverPanel></>}</Popover>;
}

function labelForRefreshment(preference: string): string {
    const labels: Record<string, string> = {
        yes: 'Yes',
        no: 'No',
        none: 'No',
        coffee: 'Yes',
        tea: 'Yes',
        coffee_tea: 'Yes',
    };

    return labels[preference] ?? preference;
}

function refreshmentValue(preference?: string): string {
    if (!preference) {
        return '';
    }

    return preference === 'no' || preference === 'none' ? 'no' : 'yes';
}

function parseDate(date: string): Date { return new Date(`${date}T00:00:00`); }
function dateKey(date: Date): string { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
function addDays(date: Date, days: number): Date { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function startOfWeek(date: Date): Date { const result = new Date(date); result.setDate(date.getDate() - date.getDay()); result.setHours(0, 0, 0, 0); return result; }
function timeToMinutes(time: string): number { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; }
function colourForRoom(roomId: number, rooms: Room[]): RoomColour { const roomIndex = rooms.findIndex((room) => room.id === roomId); return roomColours[(roomIndex >= 0 ? roomIndex : roomId) % roomColours.length]; }

function layoutBookings(bookings: Booking[]): CalendarBooking[] {
    const bookingsByDate = bookings.reduce<Record<string, Booking[]>>((groups, booking) => {
        groups[booking.date] ??= [];
        groups[booking.date].push(booking);
        return groups;
    }, {});

    return Object.values(bookingsByDate).flatMap((dayBookings) => {
        const sorted = [...dayBookings].sort((first, second) => timeToMinutes(first.start_time) - timeToMinutes(second.start_time));
        const results: CalendarBooking[] = [];
        let cluster: Booking[] = [];
        let clusterEnd = 0;

        const positionCluster = (): void => {
            if (!cluster.length) return;
            const active: Array<{ end: number; lane: number }> = [];
            const positioned: Array<Booking & { lane: number }> = [];
            let laneCount = 0;
            cluster.forEach((booking) => {
                const start = timeToMinutes(booking.start_time);
                const end = timeToMinutes(booking.end_time);
                const stillActive = active.filter((item) => item.end > start);
                const lane = Array.from({ length: stillActive.length + 1 }, (_, laneIndex) => laneIndex).find((laneIndex) => !stillActive.some((item) => item.lane === laneIndex)) ?? 0;
                active.length = 0;
                active.push(...stillActive, { end, lane });
                laneCount = Math.max(laneCount, active.length);
                positioned.push({ ...booking, lane });
            });
            results.push(...positioned.map((booking) => ({ ...booking, laneCount })));
            cluster = [];
            clusterEnd = 0;
        };

        sorted.forEach((booking) => {
            const start = timeToMinutes(booking.start_time);
            const end = timeToMinutes(booking.end_time);
            if (cluster.length && start >= clusterEnd) positionCluster();
            cluster.push(booking);
            clusterEnd = Math.max(clusterEnd, end);
        });
        positionCluster();
        return results;
    });
}

export default function Index({ bookings, calendarBookings, rooms, filters, flash }: BookingManagementProps) {
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
    const [activeView, setActiveView] = useState<'calendar' | 'table'>('calendar');
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [filterValues, setFilterValues] = useState({ date: filters.date ?? '', room_ids: filters.room_ids ?? [] });

    useModalScrollLock(selectedBooking !== null || isBookingFormOpen || bookingToCancel !== null);

    useEffect(() => {
        setFilterValues({ date: filters.date ?? '', room_ids: filters.room_ids ?? [] });
    }, [filters.date, filters.room_ids]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const updateViewport = (): void => {
            setIsMobileViewport(mediaQuery.matches);

            if (mediaQuery.matches) {
                setActiveView('table');
            }
        };

        updateViewport();
        mediaQuery.addEventListener('change', updateViewport);

        return () => mediaQuery.removeEventListener('change', updateViewport);
    }, []);

    function applyFilters(nextFilters: { date: string; room_ids: string[] }): void {
        setFilterValues(nextFilters);

        if (!isMobileViewport && nextFilters.date !== filterValues.date && nextFilters.date !== '') {
            setActiveView('calendar');
        }

        router.get(index.url(), nextFilters, { preserveScroll: true, preserveState: true, replace: true });
    }

    function clearFilters(): void {
        setFilterValues({ date: '', room_ids: [] });
        router.get(index.url(), {}, { preserveScroll: true, replace: true });
    }

    function goToPage(page: number): void {
        router.get(index.url(), {
            date: filters.date ?? '',
            room_ids: filters.room_ids ?? [],
            page,
        }, { preserveScroll: true, preserveState: true, replace: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Booking management" />
            <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
                <header className="flex flex-col items-start justify-between gap-4 border-b border-base-300 pb-6 sm:flex-row">
                    <div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Booking management</h1><p className="mt-2 max-w-2xl text-base-content/65">Booking details are available to administrators.</p></div>
                    <button type="button" onClick={() => { setBookingToEdit(null); setIsBookingFormOpen(true); }} className="btn !h-11 !min-h-11 w-full border border-slate-300 bg-white px-4 text-sm text-slate-800 hover:border-red-300 hover:bg-red-50 hover:text-red-800 sm:w-auto">Add booking</button>
                </header>
                {flash?.success && <div className="alert mt-6 border border-emerald-200 bg-emerald-100 text-emerald-800" role="status">{flash.success}</div>}
                <section className="card mt-7 border border-base-300 bg-base-100 shadow-sm">
                    <div className="card-body flex flex-col gap-4 border-b border-base-300 px-5 py-4 sm:px-6 lg:flex-row lg:items-end lg:gap-3">
                        <div className="mr-auto">
                            <h2 className="text-xl font-bold">Bookings</h2>
                            <p className="mt-1 text-sm text-base-content/65">{bookings.total} booking{bookings.total === 1 ? '' : 's'} shown · Each room has its own colour in the calendar.</p>
                        </div>
                        <div className="grid w-full gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-end lg:w-auto lg:min-w-[30rem]">
                            <div className="text-xs font-semibold text-slate-700"><span>Date</span><div className="mt-1"><DatePicker value={filterValues.date} label="Filter by date" onChange={(date) => applyFilters({ ...filterValues, date })} /></div></div>
                            <div className="text-xs font-semibold text-slate-700"><span>Rooms</span><div className="mt-1"><MultiRoomDropdown rooms={rooms} value={filterValues.room_ids} onChange={(roomIds) => applyFilters({ ...filterValues, room_ids: roomIds })} /></div></div>
                            <button type="button" onClick={clearFilters} className="btn !h-11 !min-h-11 w-full border border-slate-300 bg-white px-4 text-sm text-slate-800 hover:border-red-300 hover:bg-red-50 hover:text-red-800 sm:w-auto">Clear</button>
                        </div>
                        <div className="join grid w-full grid-cols-2 sm:w-auto sm:inline-flex" aria-label="Booking view"><button type="button" onClick={() => setActiveView('calendar')} className={`btn !h-11 !min-h-11 join-item border px-3 text-sm sm:px-4 ${activeView === 'calendar' ? 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100' : 'border-slate-300 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50 hover:text-red-800'}`}><span className="md:hidden">Calendar</span><span className="hidden md:inline">{filters.date ? 'Day calendar' : 'Week calendar'}</span></button><button type="button" onClick={() => setActiveView('table')} className={`btn !h-11 !min-h-11 join-item border px-3 text-sm sm:px-4 ${activeView === 'table' ? 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100' : 'border-slate-300 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50 hover:text-red-800'}`}><span className="md:hidden">List</span><span className="hidden md:inline">Table</span></button></div>
                    </div>
                    {activeView === 'calendar' ? <BookingCalendar bookings={calendarBookings} rooms={rooms} selectedDate={filters.date} onChangeDate={(date) => applyFilters({ ...filterValues, date })} onSelectBooking={setSelectedBooking} /> : <><BookingTable bookings={bookings.data} onSelectBooking={setSelectedBooking} /><Pagination bookings={bookings} onPageChange={goToPage} /></>}
                </section>
            </div>
            {selectedBooking && <BookingDetails booking={selectedBooking} onClose={() => setSelectedBooking(null)} onEdit={() => { setBookingToEdit(selectedBooking); setSelectedBooking(null); setIsBookingFormOpen(true); }} onDelete={() => { setBookingToCancel(selectedBooking); setSelectedBooking(null); }} />}
            {isBookingFormOpen && <BookingForm booking={bookingToEdit} rooms={rooms} onClose={() => setIsBookingFormOpen(false)} />}
            {bookingToCancel && <BookingCancellationForm booking={bookingToCancel} onClose={() => setBookingToCancel(null)} />}
        </AuthenticatedLayout>
    );
}

function BookingCalendar({ bookings, rooms, selectedDate, onChangeDate, onSelectBooking }: { bookings: Booking[]; rooms: Room[]; selectedDate: string | null; onChangeDate: (date: string) => void; onSelectBooking: (booking: Booking) => void }) {
    const isDayView = selectedDate !== null;
    const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate ? parseDate(selectedDate) : new Date()));
    useEffect(() => { setWeekStart(startOfWeek(selectedDate ? parseDate(selectedDate) : new Date())); }, [selectedDate]);
    const days = useMemo(() => selectedDate ? [parseDate(selectedDate)] : Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex)), [selectedDate, weekStart]);
    const positionedBookings = useMemo(() => layoutBookings(bookings), [bookings]);
    const today = dateKey(new Date());
    const calendarGridStyle: CSSProperties = { gridTemplateColumns: `5.25rem repeat(${days.length}, minmax(0, 1fr))` };

    function moveCalendar(daysToMove: number): void {
        if (isDayView) {
            onChangeDate(dateKey(addDays(days[0], daysToMove)));
            return;
        }

        setWeekStart(addDays(weekStart, daysToMove));
    }

    function showToday(): void {
        if (isDayView) {
            onChangeDate(today);
            return;
        }

        setWeekStart(startOfWeek(new Date()));
    }

    return (
        <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => moveCalendar(isDayView ? -1 : -7)} className="flex size-11 items-center justify-center rounded-lg border border-slate-300 text-lg font-semibold text-slate-700 transition hover:bg-slate-50" aria-label={isDayView ? 'Previous day' : 'Previous week'}>‹</button><button type="button" onClick={showToday} className="flex h-11 min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Today</button><button type="button" onClick={() => moveCalendar(isDayView ? 1 : 7)} className="flex size-11 items-center justify-center rounded-lg border border-slate-300 text-lg font-semibold text-slate-700 transition hover:bg-slate-50" aria-label={isDayView ? 'Next day' : 'Next week'}>›</button><p className="w-full text-sm font-bold text-slate-800 sm:ml-2 sm:w-auto">{isDayView ? formatDate(dateKey(days[0])) : `${formatDate(dateKey(days[0]))} – ${formatDate(dateKey(days[6]))}`}</p></div><div className="hidden flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-700 lg:flex lg:justify-end" aria-label="Room colour key">{rooms.map((room) => { const colour = colourForRoom(room.id, rooms); return <span key={room.id} className="inline-flex items-center gap-1.5"><span className={`size-3 rounded-full ${colour.dot}`} />{room.name}</span>; })}</div><details className="rounded-lg border border-slate-200 p-3 text-sm lg:hidden"><summary className="cursor-pointer font-semibold text-slate-700">Room colour key</summary><div className="mt-3 grid gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-2">{rooms.map((room) => { const colour = colourForRoom(room.id, rooms); return <span key={room.id} className="inline-flex items-center gap-1.5"><span className={`size-3 rounded-full ${colour.dot}`} />{room.name}</span>; })}</div></details></div>
            {!isDayView && <p className="mt-4 text-sm text-slate-500 lg:hidden">Swipe the calendar sideways to view every day of the week.</p>}
            <div className="mt-3 overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200"><div className={isDayView ? 'min-w-[32rem]' : 'min-w-[1024px]'}><div className="grid border-b border-slate-200 bg-slate-50" style={calendarGridStyle}><div />{days.map((day) => { const key = dateKey(day); const isToday = key === today; return <div key={key} className={`border-l border-slate-200 px-2 py-3 text-center text-sm font-bold ${isToday ? 'bg-red-50 text-red-800' : 'text-slate-700'}`}><span className="block text-xs uppercase tracking-wide">{new Intl.DateTimeFormat('en-MY', { weekday: 'short' }).format(day)}</span><span className="mt-1 block">{new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' }).format(day)}</span></div>; })}</div><div className="grid" style={calendarGridStyle}><div className="relative h-[36rem] border-r border-slate-200 bg-slate-50">{calendarHours.map((minute) => minute === calendarEndMinute ? null : <span key={minute} style={{ top: `${((minute - calendarStartMinute) / (calendarEndMinute - calendarStartMinute)) * 100}%` }} className="absolute left-0 -translate-y-1/2 whitespace-nowrap px-2 text-xs font-semibold text-slate-500">{formatTimeFromMinutes(minute)}</span>)}</div>{days.map((day) => { const key = dateKey(day); const dayBookings = positionedBookings.filter((booking) => booking.date === key); return <div key={key} className="relative h-[36rem] border-r border-slate-200 bg-white">{calendarHours.slice(1).map((minute) => <div key={minute} style={{ top: `${((minute - calendarStartMinute) / (calendarEndMinute - calendarStartMinute)) * 100}%` }} className="absolute inset-x-0 border-t border-dashed border-slate-200" />)}{dayBookings.map((booking) => <CalendarBookingBlock key={booking.id} booking={booking} rooms={rooms} onSelectBooking={onSelectBooking} />)}</div>; })}</div></div></div>
        </div>
    );
}

function CalendarBookingBlock({ booking, rooms, onSelectBooking }: { booking: CalendarBooking; rooms: Room[]; onSelectBooking: (booking: Booking) => void }) {
    const start = Math.max(timeToMinutes(booking.start_time), calendarStartMinute);
    const end = Math.min(timeToMinutes(booking.end_time), calendarEndMinute);
    const laneWidth = 100 / booking.laneCount;
    const style: CSSProperties = { top: `${((start - calendarStartMinute) / (calendarEndMinute - calendarStartMinute)) * 100}%`, height: `${Math.max(((end - start) / (calendarEndMinute - calendarStartMinute)) * 100, 6)}%`, left: `calc(${booking.lane * laneWidth}% + 0.25rem)`, width: `calc(${laneWidth}% - 0.5rem)` };
    const colour = colourForRoom(booking.room.id, rooms);
    return <button type="button" onClick={() => onSelectBooking(booking)} style={style} className={`absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 ${colour.booking}`} title={`${booking.room.name}: ${formatTime(booking.start_time)} to ${formatTime(booking.end_time)}. View details.`}><span className="block text-[11px] font-bold leading-tight">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span><span className="mt-1 block truncate text-[11px] leading-tight">{booking.visitor_name}</span><span className="mt-1 block truncate text-[10px] leading-tight opacity-90">{booking.room.name}</span></button>;
}

function BookingTable({ bookings, onSelectBooking }: { bookings: Booking[]; onSelectBooking: (booking: Booking) => void }) {
    if (!bookings.length) return <p className="px-5 py-12 text-center text-slate-600 sm:px-6">No bookings match these filters.</p>;
    return <><div className="divide-y divide-slate-200 md:hidden">{bookings.map((booking) => <article key={booking.id} className="space-y-3 px-5 py-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{formatDate(booking.date)}</p><p className="mt-1 text-sm font-medium text-slate-700">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</p></div><span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">{booking.status}</span></div><div className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><p className="font-semibold text-slate-900">{booking.room.name}</p><p className="mt-1 text-slate-700">{booking.visitor_name}</p>{booking.visitor_email && <p className="mt-1 break-all text-slate-500">{booking.visitor_email}</p>}<p className="mt-1 text-slate-500">{booking.attendee_count} attendee{booking.attendee_count === 1 ? '' : 's'}</p></div><button type="button" onClick={() => onSelectBooking(booking)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800">View details</button></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600"><tr><th className="px-5 py-3 sm:px-6">Date & time</th><th className="px-5 py-3">Room</th><th className="px-5 py-3">Visitor</th><th className="px-5 py-3">Attendees</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 sm:px-6"><span className="sr-only">Details</span></th></tr></thead><tbody className="divide-y divide-slate-200 text-slate-700">{bookings.map((booking) => <tr key={booking.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-4 font-medium sm:px-6"><span>{formatDate(booking.date)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span></td><td className="px-5 py-4">{booking.room.name}</td><td className="px-5 py-4"><p className="font-medium">{booking.visitor_name}</p><p className="mt-1 text-slate-500">{booking.visitor_email}</p></td><td className="px-5 py-4">{booking.attendee_count}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">{booking.status}</span></td><td className="px-5 py-4 text-right sm:px-6"><button type="button" onClick={() => onSelectBooking(booking)} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800">View details</button></td></tr>)}</tbody></table></div></>;
}

function paginationItems(currentPage: number, lastPage: number): Array<number | 'ellipsis'> {
    if (lastPage <= 7) return Array.from({ length: lastPage }, (_, index) => index + 1);

    const pages: Array<number | 'ellipsis'> = [1];
    const firstNearbyPage = Math.max(2, currentPage - 1);
    const lastNearbyPage = Math.min(lastPage - 1, currentPage + 1);

    if (firstNearbyPage > 2) pages.push('ellipsis');

    for (let page = firstNearbyPage; page <= lastNearbyPage; page += 1) {
        pages.push(page);
    }

    if (lastNearbyPage < lastPage - 1) pages.push('ellipsis');

    pages.push(lastPage);

    return pages;
}

function Pagination({ bookings, onPageChange }: { bookings: BookingPaginator; onPageChange: (page: number) => void }) {
    if (bookings.last_page <= 1) return null;

    const buttonClass = 'flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-700';

    return <div className="flex flex-col gap-3 border-t border-base-300 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-sm text-base-content/65">Showing {bookings.from}–{bookings.to} of {bookings.total} bookings</p><nav className="flex items-center justify-between gap-2 sm:justify-end" aria-label="Table pagination"><button type="button" disabled={bookings.current_page === 1} onClick={() => onPageChange(bookings.current_page - 1)} className={buttonClass}><span aria-hidden="true" className="text-lg leading-none">‹</span><span className="ml-1 hidden sm:inline">Previous</span><span className="sr-only">Previous page</span></button><span className="text-sm font-semibold text-slate-600 sm:hidden">Page {bookings.current_page} of {bookings.last_page}</span><div className="hidden items-center gap-1 sm:flex">{paginationItems(bookings.current_page, bookings.last_page).map((item, index) => item === 'ellipsis' ? <span key={`${item}-${index}`} className="flex size-10 items-center justify-center text-sm text-slate-400" aria-hidden="true">…</span> : <button key={item} type="button" onClick={() => onPageChange(item)} aria-current={item === bookings.current_page ? 'page' : undefined} className={`flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition ${item === bookings.current_page ? 'border-primary bg-primary text-primary-content' : 'border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800'}`}>{item}</button>)}</div><button type="button" disabled={bookings.current_page === bookings.last_page} onClick={() => onPageChange(bookings.current_page + 1)} className={buttonClass}><span className="mr-1 hidden sm:inline">Next</span><span aria-hidden="true" className="text-lg leading-none">›</span><span className="sr-only">Next page</span></button></nav></div>;
}

function BookingDetails({ booking, onClose, onEdit, onDelete }: { booking: Booking; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
    const details = [['Booking date', formatDate(booking.date)], ['Start time', formatTime(booking.start_time)], ['End time', formatTime(booking.end_time)], ['Room', booking.room.name], ['Visitor name', booking.visitor_name], ['Email', booking.visitor_email], ['Mobile number', booking.visitor_mobile || 'Not provided'], ['Number of attendees', String(booking.attendee_count)], ['Refreshment request', labelForRefreshment(booking.refreshment_preference)], ['Booking status', booking.status], ['Created date', formatCreatedAt(booking.created_at)]];
    return <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-y-auto overscroll-contain bg-slate-950/40 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="booking-details-title"><section className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl shrink-0 overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-xl"><header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><div><h2 id="booking-details-title" className="text-xl font-bold">Booking details</h2><p className="mt-1 text-sm text-slate-600">Private information for administrators.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close booking details">✕</button></header><dl className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 sm:px-6">{details.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd></div>)}</dl><footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6"><button type="button" onClick={onDelete} className="btn btn-primary btn-sm">Cancel booking</button><button type="button" onClick={onEdit} className="btn btn-sm !border-red-200 !bg-red-100 !text-red-700 hover:!border-red-300 hover:!bg-red-200">Edit</button><button type="button" onClick={onClose} className="btn btn-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Close</button></footer></section></div>;
}

function BookingCancellationForm({ booking, onClose }: { booking: Booking; onClose: () => void }) {
    const { data, setData, delete: deleteBooking, processing, errors } = useForm({ reason: '' });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        deleteBooking(destroy(booking).url, { preserveScroll: true, onSuccess: onClose });
    }

    return <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-y-auto overscroll-contain bg-slate-950/40 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="booking-cancellation-title"><form onSubmit={submit} className="max-h-[calc(100dvh-2rem)] w-full max-w-xl shrink-0 overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-xl"><header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><div><h2 id="booking-cancellation-title" className="text-xl font-bold">Cancel booking</h2><p className="mt-1 text-sm text-slate-600">The visitor will receive a cancellation email.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close cancellation form">✕</button></header><div className="space-y-4 px-5 py-5 sm:px-6"><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span className="font-semibold">{booking.visitor_name}'s booking</span> for {formatDate(booking.date)} at {formatTime(booking.start_time)} will be cancelled.</div><label className="block text-sm font-semibold text-slate-700">Reason for cancellation (optional)<textarea value={data.reason} onChange={(event) => setData('reason', event.target.value)} className="field mt-1 min-h-24 resize-y" maxLength={500} />{errors.reason && <span className="mt-1 block text-sm text-error">{errors.reason}</span>}</label></div><footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Keep booking</button><button type="submit" disabled={processing} className="btn btn-primary btn-sm">{processing ? 'Cancelling…' : 'Cancel booking'}</button></footer></form></div>;
}

function BookingForm({ booking, rooms, onClose }: { booking: Booking | null; rooms: Room[]; onClose: () => void }) {
    const isEditing = booking !== null;
    const { data, setData, post, put, processing, errors } = useForm({
        room_id: booking?.room.id ?? rooms[0]?.id ?? 0,
        date: booking?.date ?? dateKey(new Date()),
        start_time: booking?.start_time ?? '08:30',
        end_time: booking?.end_time ?? '09:00',
        visitor_name: booking?.visitor_name ?? '',
        visitor_email: booking?.visitor_email ?? '',
        visitor_mobile: booking?.visitor_mobile ?? '',
        attendee_count: booking?.attendee_count ?? 1,
        refreshment_preference: refreshmentValue(booking?.refreshment_preference),
        change_reason: '',
    });
    const [availabilityData, setAvailabilityData] = useState<Availability>();
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
    const [availabilityError, setAvailabilityError] = useState<string>();

    useEffect(() => {
        let isCurrentRequest = true;

        async function loadAvailability(): Promise<void> {
            setIsLoadingAvailability(true);
            setAvailabilityError(undefined);
            setAvailabilityData(undefined);

            try {
                const response = await fetch(availability.url({ query: { date: data.date } }), {
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) {
                    throw new Error('Unable to load availability.');
                }

                if (isCurrentRequest) {
                    setAvailabilityData((await response.json()) as Availability);
                }
            } catch {
                if (isCurrentRequest) {
                    setAvailabilityError('Unable to load availability. The final check will happen when you save.');
                }
            } finally {
                if (isCurrentRequest) {
                    setIsLoadingAvailability(false);
                }
            }
        }

        void loadAvailability();

        return () => {
            isCurrentRequest = false;
        };
    }, [data.date]);

    const selectedAvailabilityRoom = availabilityData?.rooms.find((room) => room.id === data.room_id);
    const availableSlotStarts = new Set(selectedAvailabilityRoom?.time_slots.map((slot) => slot.start) ?? []);

    if (booking?.room.id === data.room_id && booking.date === data.date) {
        startTimes
            .filter((time) => time >= booking.start_time && time < booking.end_time)
            .forEach((time) => availableSlotStarts.add(time));
    }

    const hasLiveAvailability = availabilityData !== undefined && availabilityError === undefined;

    function isAvailableStartTime(startTime: string): boolean {
        return !hasLiveAvailability || availableSlotStarts.has(startTime);
    }

    function isAvailableEndTimeForStart(startTime: string, endTime: string): boolean {
        if (!hasLiveAvailability) {
            return true;
        }

        const startIndex = startTimes.indexOf(startTime);
        const endIndex = endTimes.indexOf(endTime);

        return startIndex >= 0
            && endIndex >= startIndex
            && startTimes.slice(startIndex, endIndex + 1).every((time) => availableSlotStarts.has(time));
    }

    function isAvailableEndTime(endTime: string): boolean {
        return isAvailableEndTimeForStart(data.start_time, endTime);
    }

    function chooseStartTime(startTime: string): void {
        setData('start_time', startTime);

        const firstAvailableEndTime = endTimes.find((endTime) => isAvailableEndTimeForStart(startTime, endTime));

        if (firstAvailableEndTime) {
            setData('end_time', firstAvailableEndTime);
        }
    }

    useEffect(() => {
        if (!hasLiveAvailability) {
            return;
        }

        const firstAvailableStartTime = startTimes.find(isAvailableStartTime);

        if (!firstAvailableStartTime) {
            return;
        }

        const startTime = isAvailableStartTime(data.start_time) ? data.start_time : firstAvailableStartTime;
        const firstAvailableEndTime = endTimes.find((endTime) => isAvailableEndTimeForStart(startTime, endTime));

        if (startTime !== data.start_time) {
            setData('start_time', startTime);
        }

        if (firstAvailableEndTime && !isAvailableEndTimeForStart(startTime, data.end_time)) {
            setData('end_time', firstAvailableEndTime);
        }
    }, [availabilityData, data.room_id]);

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: onClose };

        if (booking) {
            put(update(booking).url, options);
            return;
        }

        post(store.url(), options);
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-y-auto overscroll-contain bg-slate-950/40 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="booking-form-title">
            <form onSubmit={submit} className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl shrink-0 overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-xl">
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div>
                        <h2 id="booking-form-title" className="text-xl font-bold">{isEditing ? 'Edit booking' : 'Add booking'}</h2>
                        <p className="mt-1 text-sm text-slate-600">Only available times are shown.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close booking form">✕</button>
                </header>
                <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                    <div className="text-sm font-semibold text-slate-700"><span>Date</span><div className="mt-1"><DatePicker value={data.date} label="Booking date" onChange={(date) => setData('date', date)} /></div>{errors.date && <span className="mt-1 block text-sm text-error">{errors.date}</span>}</div>
                    <div className="text-sm font-semibold text-slate-700"><span>Room</span><div className="mt-1"><Dropdown value={String(data.room_id)} options={rooms.map((room) => ({ value: String(room.id), label: room.name }))} placeholder="Select a room" label="Booking room" onChange={(roomId) => setData('room_id', Number(roomId))} /></div>{errors.room_id && <span className="mt-1 block text-sm text-error">{errors.room_id}</span>}</div>
                    <div className="text-sm font-semibold text-slate-700"><span>Start time</span><div className="mt-1"><Dropdown value={data.start_time} options={startTimes.filter(isAvailableStartTime).map((time) => ({ value: time, label: formatTime(time) }))} placeholder="Select start time" label="Start time" disabled={isLoadingAvailability} onChange={chooseStartTime} /></div>{errors.start_time && <span className="mt-1 block text-sm text-error">{errors.start_time}</span>}</div>
                    <div className="text-sm font-semibold text-slate-700"><span>End time</span><div className="mt-1"><Dropdown value={data.end_time} options={endTimes.filter(isAvailableEndTime).map((time) => ({ value: time, label: formatTime(time) }))} placeholder="Select end time" label="End time" disabled={isLoadingAvailability} onChange={(endTime) => setData('end_time', endTime)} /></div>{errors.end_time && <span className="mt-1 block text-sm text-error">{errors.end_time}</span>}</div>
                    <p className="text-xs text-slate-500 sm:col-span-2" role="status">{isLoadingAvailability ? 'Checking available times…' : availabilityError ?? 'Only available times are listed.'}</p>
                    <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Visitor name<input value={data.visitor_name} onChange={(event) => setData('visitor_name', event.target.value)} className="field mt-1" autoComplete="name" />{errors.visitor_name && <span className="mt-1 block text-sm text-error">{errors.visitor_name}</span>}</label>
                    <label className="block text-sm font-semibold text-slate-700">Email<input type="email" value={data.visitor_email} onChange={(event) => setData('visitor_email', event.target.value)} className="field mt-1" autoComplete="email" required />{errors.visitor_email && <span className="mt-1 block text-sm text-error">{errors.visitor_email}</span>}</label>
                    <label className="block text-sm font-semibold text-slate-700">Mobile number (optional)<input type="tel" value={data.visitor_mobile} onChange={(event) => setData('visitor_mobile', event.target.value)} className="field mt-1" autoComplete="tel" />{errors.visitor_mobile && <span className="mt-1 block text-sm text-error">{errors.visitor_mobile}</span>}</label>
                    <label className="block text-sm font-semibold text-slate-700">No. of attendees<input type="number" min="1" max="500" value={data.attendee_count} onChange={(event) => setData('attendee_count', Number(event.target.value))} className="field mt-1" />{errors.attendee_count && <span className="mt-1 block text-sm text-error">{errors.attendee_count}</span>}</label>
                    <div className="text-sm font-semibold text-slate-700"><span>Refreshments needed?</span><div className="mt-1"><Dropdown value={data.refreshment_preference} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} placeholder="Select an option" label="Refreshments needed" onChange={(refreshmentPreference) => setData('refreshment_preference', refreshmentPreference)} /></div>{errors.refreshment_preference && <span className="mt-1 block text-sm text-error">{errors.refreshment_preference}</span>}</div>
                    {isEditing && <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Reason for change (optional)<textarea value={data.change_reason} onChange={(event) => setData('change_reason', event.target.value)} className="field mt-1 min-h-20 resize-y" maxLength={500} />{errors.change_reason && <span className="mt-1 block text-sm text-error">{errors.change_reason}</span>}</label>}
                </div>
                <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
                    <button type="submit" disabled={processing || isLoadingAvailability} className="btn btn-primary btn-sm">{processing ? 'Saving…' : isEditing ? 'Save changes' : 'Add booking'}</button>
                </footer>
            </form>
        </div>
    );
}
