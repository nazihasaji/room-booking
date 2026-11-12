import GuestLayout from '@/Layouts/GuestLayout';
import { request as passwordRequest } from '@/routes/password';
import { Head, Link } from '@inertiajs/react';

export default function ResetLinkExpired() {
    return (
        <GuestLayout>
            <Head title="Reset Link Expired" />

            <div className="space-y-6 text-center">
                <div className="space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-2xl font-bold text-error">
                        !
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-base-content">
                            This reset link is no longer valid
                        </h1>
                        <p className="text-sm leading-6 text-base-content/70">
                            Password reset links expire after a short time and
                            can only be used once. Request a new link to choose
                            your password.
                        </p>
                    </div>
                </div>

                <Link
                    href={passwordRequest.url()}
                    className="btn btn-primary w-full"
                >
                    Request a new reset link
                </Link>
            </div>
        </GuestLayout>
    );
}
