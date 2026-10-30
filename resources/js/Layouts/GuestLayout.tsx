import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="hero min-h-screen bg-base-200 px-4 py-10">
            <div className="hero-content w-full max-w-md p-0">
                <div className="card w-full border border-base-300 bg-base-100 shadow-xl"><div className="card-body">
                    <Link href="/" className="mb-3 text-center text-2xl font-black tracking-tight text-primary">Room Reserve</Link>
                    {children}
                </div></div>
            </div>
        </div>
    );
}
