import { Link, usePage } from '@inertiajs/react';
import { index as adminBookingIndex } from '@/routes/admin/bookings';
import { index as accountIndex } from '@/routes/admin/users';
import { index as bookingIndex } from '@/routes/bookings';
import { edit as profileEdit } from '@/routes/profile';
import { logout } from '@/routes';
import { PropsWithChildren, ReactNode } from 'react';

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;

    return (
        <div className="min-h-screen bg-base-200">
            <nav className="border-b border-base-300 bg-base-100 shadow-sm">
                <div className="flex min-h-16 items-center px-4 py-2 sm:px-6">
                    <Link href={bookingIndex.url()} className="flex items-center gap-3 text-lg font-black tracking-tight text-primary">
                        <img src="/images/shorefield-logo.png" alt="Shorefield" className="h-8 w-auto" />
                        <span>Room Reserve</span>
                    </Link>
                    <div className="dropdown dropdown-end ml-auto">
                        <button type="button" tabIndex={0} className="btn btn-sm btn-ghost gap-2" aria-label="Open account menu">
                            <span className="hidden max-w-40 truncate sm:inline">{user.name}</span>
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary font-bold text-primary-content" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
                            <span aria-hidden="true">⌄</span>
                        </button>
                        <ul tabIndex={0} className="menu dropdown-content z-20 mt-3 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
                            <li className="menu-title"><span className="truncate">{user.email}</span></li>
                            <li><Link href={bookingIndex.url()} className={route().current('bookings.*') ? 'active' : ''}>Book a room</Link></li>
                            <li><Link href={adminBookingIndex.url()} className={route().current('admin.bookings.*') ? 'active' : ''}>Booking management</Link></li>
                            {user.is_super_admin && <li><Link href={accountIndex.url()} className={route().current('admin.users.*') ? 'active' : ''}>Manage users</Link></li>}
                            <li><Link href={profileEdit.url()} className={route().current('profile.*') ? 'active' : ''}>Profile</Link></li>
                            <li className="my-1 border-t border-base-300" aria-hidden="true" />
                            <li><Link href={logout.url()} method="post" as="button" className="text-error">Log out</Link></li>
                        </ul>
                    </div>
                </div>
            </nav>
            {header && <header className="border-b border-base-300 bg-base-100"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div></header>}
            <main>{children}</main>
        </div>
    );
}
