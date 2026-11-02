import { Head, router } from '@inertiajs/react';
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { index } from '@/routes/admin/bookings';

type Room = { id: number; name: string };
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
    private_purpose: string | null;
    status: string;
    created_at: string;
};
type CalendarBooking = Booking & { lane: number; laneCount: number };
type Filters = { date: string | null; room_id: string; status: string };
type BookingPaginator = { data: Booking[]; current_page: number; last_page: number; per_page: number; from: number | null; to: number | null; total: number };
type BookingManagementProps = { bookings: BookingPaginator; calendarBookings: Booking[]; rooms: Room[]; filters: Filters; statuses: string[] };
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
const calendarStartMinute = 9 * 60;
const calendarEndMinute = 18 * 60;
const calendarHours = Array.from({ length: 10 }, (_, index) => 9 + index);

function formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

function formatTime(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    return new Intl.DateTimeFormat('en-MY', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, minute));
}

function formatCreatedAt(createdAt: string): string {
    return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(createdAt));
}

function labelForRefreshment(preference: string): string {
    return preference === 'none' ? 'No refreshments' : preference[0].toUpperCase() + preference.slice(1);
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

export default function Index({ bookings, calendarBookings, rooms, filters, statuses }: BookingManagementProps) {
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [activeView, setActiveView] = useState<'calendar' | 'table'>('calendar');
    const [filterValues, setFilterValues] = useState({ date: filters.date ?? '', room_id: filters.room_id, status: filters.status });

    function applyFilters(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        router.get(index.url(), filterValues, { preserveScroll: true, replace: true });
    }

    function clearFilters(): void {
        setFilterValues({ date: '', room_id: '', status: '' });
        router.get(index.url(), {}, { preserveScroll: true, replace: true });
    }

    function goToPage(page: number): void {
        router.get(index.url(), {
            date: filters.date ?? '',
            room_id: filters.room_id,
            status: filters.status,
            page,
        }, { preserveScroll: true, preserveState: true, replace: true });
    }

    return (
        <main className="min-h-screen bg-base-200 text-base-content">
            <Head title="Booking management" />
            <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
                <header className="border-b border-base-300 pb-6">
                    <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Room Reserve</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Booking management</h1><p className="mt-2 max-w-2xl text-base-content/65">Private booking details are visible only to super administrators.</p></div>
                </header>
                <section className="card mt-7 border border-base-300 bg-base-100 shadow-sm">
                    <div className="card-body flex flex-wrap items-end gap-3 border-b border-base-300 px-5 py-4 sm:px-6 lg:flex-row">
                        <div className="mr-auto">
                            <h2 className="text-xl font-bold">Bookings</h2>
                            <p className="mt-1 text-sm text-base-content/65">{bookings.total} booking{bookings.total === 1 ? '' : 's'} shown · Each room has its own colour in the calendar.</p>
                        </div>
                        <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-2">
                            <label className="block w-36 text-xs font-semibold text-slate-700">Date<input type="date" value={filterValues.date} onChange={(event) => setFilterValues({ ...filterValues, date: event.target.value })} className="field mt-1 h-9 px-2 text-sm" /></label>
                            <label className="block w-52 text-xs font-semibold text-slate-700">Room<select value={filterValues.room_id} onChange={(event) => setFilterValues({ ...filterValues, room_id: event.target.value })} className="field mt-1 h-9 px-2 text-sm"><option value="">All rooms</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
                            <label className="block w-44 text-xs font-semibold text-slate-700">Status<select value={filterValues.status} onChange={(event) => setFilterValues({ ...filterValues, status: event.target.value })} className="field mt-1 h-9 px-2 text-sm"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                            <div className="flex gap-2"><button type="submit" className="btn btn-primary btn-sm">Apply</button><button type="button" onClick={clearFilters} className="btn btn-ghost btn-sm">Clear</button></div>
                        </form>
                        <div className="join" aria-label="Booking view"><button type="button" onClick={() => setActiveView('calendar')} className={`btn btn-sm join-item ${activeView === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}>Week calendar</button><button type="button" onClick={() => setActiveView('table')} className={`btn btn-sm join-item ${activeView === 'table' ? 'btn-primary' : 'btn-ghost'}`}>Table</button></div>
                    </div>
                    {activeView === 'calendar' ? <BookingCalendar bookings={calendarBookings} rooms={rooms} selectedDate={filters.date} onSelectBooking={setSelectedBooking} /> : <><BookingTable bookings={bookings.data} onSelectBooking={setSelectedBooking} /><Pagination bookings={bookings} onPageChange={goToPage} /></>}
                </section>
            </div>
            {selectedBooking && <BookingDetails booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
        </main>
    );
}

function BookingCalendar({ bookings, rooms, selectedDate, onSelectBooking }: { bookings: Booking[]; rooms: Room[]; selectedDate: string | null; onSelectBooking: (booking: Booking) => void }) {
    const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate ? parseDate(selectedDate) : new Date()));
    useEffect(() => { setWeekStart(startOfWeek(selectedDate ? parseDate(selectedDate) : new Date())); }, [selectedDate]);
    const days = useMemo(() => Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex)), [weekStart]);
    const positionedBookings = useMemo(() => layoutBookings(bookings), [bookings]);
    const today = dateKey(new Date());
    return (
        <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2"><button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50" aria-label="Previous week">‹</button><button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Today</button><button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50" aria-label="Next week">›</button><p className="ml-2 text-sm font-bold text-slate-800">{formatDate(dateKey(days[0]))} – {formatDate(dateKey(days[6]))}</p></div><div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-700" aria-label="Room colour key">{rooms.map((room) => { const colour = colourForRoom(room.id, rooms); return <span key={room.id} className="inline-flex items-center gap-1.5"><span className={`size-3 rounded-full ${colour.dot}`} />{room.name}</span>; })}</div></div>
            <div className="mt-5 overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200"><div className="min-w-[980px]"><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50"><div />{days.map((day) => { const key = dateKey(day); const isToday = key === today; return <div key={key} className={`border-l border-slate-200 px-2 py-3 text-center text-sm font-bold ${isToday ? 'bg-red-50 text-red-800' : 'text-slate-700'}`}><span className="block text-xs uppercase tracking-wide">{new Intl.DateTimeFormat('en-MY', { weekday: 'short' }).format(day)}</span><span className="mt-1 block">{new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' }).format(day)}</span></div>; })}</div><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]"><div className="relative h-[36rem] border-r border-slate-200 bg-slate-50">{calendarHours.map((hour) => <span key={hour} style={{ top: hour === 18 ? 'calc(100% - 0.75rem)' : `${((hour - 9) / 9) * 100}%` }} className="absolute left-0 -translate-y-1/2 px-2 text-xs font-semibold text-slate-500">{new Intl.DateTimeFormat('en-MY', { hour: 'numeric' }).format(new Date(2000, 0, 1, hour))}</span>)}</div>{days.map((day) => { const key = dateKey(day); const dayBookings = positionedBookings.filter((booking) => booking.date === key); return <div key={key} className="relative h-[36rem] border-r border-slate-200 bg-white">{calendarHours.slice(1).map((hour) => <div key={hour} style={{ top: `${((hour - 9) / 9) * 100}%` }} className="absolute inset-x-0 border-t border-dashed border-slate-200" />)}{dayBookings.map((booking) => <CalendarBookingBlock key={booking.id} booking={booking} rooms={rooms} onSelectBooking={onSelectBooking} />)}</div>; })}</div></div></div>
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
    return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600"><tr><th className="px-5 py-3 sm:px-6">Date & time</th><th className="px-5 py-3">Room</th><th className="px-5 py-3">Visitor</th><th className="px-5 py-3">Attendees</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 sm:px-6"><span className="sr-only">Details</span></th></tr></thead><tbody className="divide-y divide-slate-200 text-slate-700">{bookings.map((booking) => <tr key={booking.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-4 font-medium sm:px-6"><p>{formatDate(booking.date)}</p><p className="mt-1 text-slate-500">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</p></td><td className="px-5 py-4">{booking.room.name}</td><td className="px-5 py-4"><p className="font-medium">{booking.visitor_name}</p><p className="mt-1 text-slate-500">{booking.visitor_email}</p></td><td className="px-5 py-4">{booking.attendee_count}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">{booking.status}</span></td><td className="px-5 py-4 text-right sm:px-6"><button type="button" onClick={() => onSelectBooking(booking)} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800">View details</button></td></tr>)}</tbody></table></div>;
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

    return <div className="flex flex-col gap-3 border-t border-base-300 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-sm text-base-content/65">Showing {bookings.from}–{bookings.to} of {bookings.total} bookings</p><div className="join" aria-label="Table pagination"><button type="button" disabled={bookings.current_page === 1} onClick={() => onPageChange(bookings.current_page - 1)} className="btn btn-sm join-item">Previous</button>{paginationItems(bookings.current_page, bookings.last_page).map((item, index) => item === 'ellipsis' ? <span key={`${item}-${index}`} className="btn btn-sm btn-ghost join-item pointer-events-none">…</span> : <button key={item} type="button" onClick={() => onPageChange(item)} aria-current={item === bookings.current_page ? 'page' : undefined} className={`btn btn-sm join-item ${item === bookings.current_page ? 'btn-primary' : 'btn-ghost'}`}>{item}</button>)}<button type="button" disabled={bookings.current_page === bookings.last_page} onClick={() => onPageChange(bookings.current_page + 1)} className="btn btn-sm join-item">Next</button></div></div>;
}

function BookingDetails({ booking, onClose }: { booking: Booking; onClose: () => void }) {
    const details = [['Booking date', formatDate(booking.date)], ['Start time', formatTime(booking.start_time)], ['End time', formatTime(booking.end_time)], ['Room', booking.room.name], ['Visitor name', booking.visitor_name], ['Email', booking.visitor_email], ['Mobile number', booking.visitor_mobile || 'Not provided'], ['Number of attendees', String(booking.attendee_count)], ['Refreshment request', labelForRefreshment(booking.refreshment_preference)], ['Booking status', booking.status], ['Created date', formatCreatedAt(booking.created_at)]];
    return <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="booking-details-title"><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"><header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><div><h2 id="booking-details-title" className="text-xl font-bold">Booking details</h2><p className="mt-1 text-sm text-slate-600">Private information for super administrators.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close booking details">✕</button></header><dl className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 sm:px-6">{details.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd></div>)}<div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Private meeting purpose</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">{booking.private_purpose || 'Not provided'}</dd></div></dl><footer className="border-t border-slate-200 px-5 py-4 text-right sm:px-6"><button type="button" onClick={onClose} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800">Close</button></footer></section></div>;
}
