import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout
            header={
                <div><p className="text-sm font-semibold text-primary">ACCOUNT</p><h2 className="text-2xl font-bold">Profile</h2></div>
            }
        >
            <Head title="Profile" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="card border border-base-300 bg-base-100 shadow-sm"><div className="card-body">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div></div>

                    <div className="card border border-base-300 bg-base-100 shadow-sm"><div className="card-body">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div></div>

                    <div className="card border border-base-300 bg-base-100 shadow-sm"><div className="card-body">
                        <DeleteUserForm className="max-w-xl" />
                    </div></div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
