import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }: PageProps) {
    return (
        <>
            <Head title="Room Reserve" />
            <main className="min-h-screen bg-base-200">
                <nav className="navbar mx-auto max-w-6xl px-4 sm:px-6"><div className="navbar-start text-xl font-black tracking-tight text-primary">Room Reserve</div><div className="navbar-end gap-2">{auth.user ? <Link href={route('dashboard')} className="btn btn-primary btn-sm">Dashboard</Link> : <><Link href={route('login')} className="btn btn-ghost btn-sm">Log in</Link><Link href={route('register')} className="btn btn-primary btn-sm">Create account</Link></>}</div></nav>
                <section className="hero mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-12 sm:px-6"><div className="hero-content grid w-full gap-10 p-0 lg:grid-cols-[1.15fr_0.85fr]">
                    <div><div className="badge badge-primary badge-outline mb-5">Simple room scheduling</div><h1 className="text-5xl font-black leading-tight tracking-tight sm:text-6xl">Meet better, without the back-and-forth.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-base-content/70">Find the right room, pick an open time, and reserve it in minutes. Room Reserve keeps every booking clear and organised.</p><div className="mt-8 flex flex-wrap gap-3"><Link href={route('bookings.index')} className="btn btn-primary">Book a room</Link>{!auth.user && <Link href={route('login')} className="btn btn-outline">Admin sign in</Link>}</div></div>
                    <div className="card border border-base-300 bg-base-100 shadow-2xl"><div className="card-body gap-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-base-content/60">Today at a glance</p><h2 className="text-2xl font-bold">Room availability</h2></div><span className="badge badge-success badge-outline">Live</span></div><div className="rounded-box bg-base-200 p-4"><p className="font-semibold">Choose your schedule</p><p className="mt-1 text-sm text-base-content/65">Browse available rooms and uninterrupted time slots.</p></div><div className="rounded-box bg-base-200 p-4"><p className="font-semibold">Share the essentials</p><p className="mt-1 text-sm text-base-content/65">Add attendee numbers and refreshment preferences in one form.</p></div><div className="rounded-box bg-base-200 p-4"><p className="font-semibold">Stay in control</p><p className="mt-1 text-sm text-base-content/65">Administrators get a clear booking calendar and detailed view.</p></div></div></div>
                </div></section>
            </main>
        </>
    );
}
