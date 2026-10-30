import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;

    return (
        <div className="min-h-screen bg-base-200">
            <nav className="navbar border-b border-base-300 bg-base-100 px-4 shadow-sm sm:px-6">
                <div className="navbar-start">
                    <Link href="/" className="text-lg font-black tracking-tight text-primary">Room Reserve</Link>
                </div>
                <div className="navbar-center hidden sm:flex">
                    <Link href={route('dashboard')} className={`btn btn-sm btn-ghost ${route().current('dashboard') ? 'btn-active' : ''}`}>Dashboard</Link>
                </div>
                <div className="navbar-end gap-2">
                    <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-base-content/60">{user.email}</p></div>
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-circle btn-ghost" aria-label="Account menu"><span className="text-lg font-bold">{user.name.charAt(0).toUpperCase()}</span></label>
                        <ul tabIndex={0} className="menu dropdown-content z-20 mt-3 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
                            <li><Link href={route('profile.edit')}>Profile</Link></li>
                            <li><Link href={route('logout')} method="post" as="button">Log out</Link></li>
                        </ul>
                    </div>
                </div>
            </nav>
            {header && <header className="border-b border-base-300 bg-base-100"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div></header>}
            <main>{children}</main>
        </div>
    );
}
