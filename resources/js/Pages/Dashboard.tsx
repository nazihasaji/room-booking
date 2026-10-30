import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            header={
                <div><p className="text-sm font-semibold text-primary">ROOM RESERVE</p><h2 className="text-2xl font-bold">Dashboard</h2></div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="card border border-base-300 bg-base-100 shadow-sm"><div className="card-body"><h3 className="card-title">You’re signed in</h3><p>Use the account menu to manage your profile, or return to the booking page to reserve a room.</p><div className="card-actions mt-2"><a href={route('bookings.index')} className="btn btn-primary">Book a room</a></div></div></div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
