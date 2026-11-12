import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal, { useModalScrollLock } from '@/Components/Modal';
import { destroy, store, update } from '@/actions/App/Http/Controllers/Admin/UserController';
import { index as accountIndex } from '@/routes/admin/users';
import { PageProps } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    is_super_admin: boolean;
    created_at: string;
};

type Paginator = {
    data: ManagedUser[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
};

export default function Index({ users }: PageProps<{ users: Paginator }>) {
    const currentUser = usePage().props.auth.user;
    const flash = usePage().props.flash as { success?: string; error?: string };
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useModalScrollLock(isCreating || selectedUser !== null);

    function closeForm(): void {
        setSelectedUser(null);
        setIsCreating(false);
    }

    function confirmUserDeletion(): void {
        if (!userToDelete) {
            return;
        }

        router.delete(destroy(userToDelete).url, {
            preserveScroll: true,
            onSuccess: () => setUserToDelete(null),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Manage accounts" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {flash.success && <div className="alert border-emerald-200 bg-emerald-100 text-emerald-800"><span>{flash.success}</span></div>}
                    {flash.error && <div className="alert alert-error"><span>{flash.error}</span></div>}

                    <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
                        <header className="flex flex-col gap-4 border-b border-base-300 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                            <div><h3 className="text-xl font-bold">Accounts</h3><p className="mt-1 text-sm text-base-content/65">Create and manage staff access to Room Reserve.</p></div>
                            <button type="button" onClick={() => setIsCreating(true)} className="btn w-full border border-slate-300 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50 hover:text-red-800 sm:w-auto">Add account</button>
                        </header>

                        <div className="divide-y divide-base-300 md:hidden">
                            {users.data.map((user) => <article key={user.id} className="space-y-4 p-5">
                                <div className="min-w-0">
                                    <h4 className="break-words font-semibold">{user.name}{user.id === currentUser.id && <span className="ml-2 text-xs font-normal text-base-content/60">(you)</span>}</h4>
                                    <p className="mt-1 break-all text-sm text-base-content/65">{user.email}</p>
                                </div>
                                <dl className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-4 text-sm">
                                    <div className="space-y-1"><dt className="text-xs font-semibold uppercase tracking-wide text-base-content/55">Access</dt><dd><AccountAccessBadge isSuperAdmin={user.is_super_admin} /></dd></div>
                                    <div className="space-y-1"><dt className="text-xs font-semibold uppercase tracking-wide text-base-content/55">Created</dt><dd className="font-medium">{formatCreatedDate(user.created_at)}</dd></div>
                                </dl>
                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={() => setSelectedUser(user)} className="btn border border-slate-300 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50 hover:text-red-800">Edit</button>
                                    <button type="button" onClick={() => setUserToDelete(user)} disabled={user.id === currentUser.id} title={user.id === currentUser.id ? 'Use Profile to delete your own account.' : undefined} className="btn btn-error btn-outline disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-100">Delete</button>
                                </div>
                            </article>)}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="table table-zebra">
                                <thead><tr><th>Name</th><th>Email</th><th>Access</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead>
                                <tbody>
                                    {users.data.map((user) => <tr key={user.id}>
                                        <td><div className="font-semibold">{user.name}{user.id === currentUser.id && <span className="ml-2 text-xs font-normal text-base-content/60">(you)</span>}</div></td>
                                        <td>{user.email}</td>
                                        <td><AccountAccessBadge isSuperAdmin={user.is_super_admin} /></td>
                                        <td>{formatCreatedDate(user.created_at)}</td>
                                        <td className="text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedUser(user)} className="btn btn-sm border border-slate-300 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50 hover:text-red-800">Edit</button><button type="button" onClick={() => setUserToDelete(user)} disabled={user.id === currentUser.id} title={user.id === currentUser.id ? 'Use Profile to delete your own account.' : undefined} className="btn btn-error btn-outline btn-sm disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-100">Delete</button></div></td>
                                    </tr>)}
                                </tbody>
                            </table>
                        </div>

                        {!users.data.length && <p className="p-12 text-center text-base-content/65">No accounts found.</p>}
                        <Pagination users={users} />
                    </section>
                </div>
            </div>

            {(isCreating || selectedUser) && <AccountForm user={selectedUser} currentUserId={currentUser.id} onClose={closeForm} />}
            <Modal show={userToDelete !== null} onClose={() => setUserToDelete(null)} maxWidth="md">
                {userToDelete && <div className="space-y-6 p-6">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold">Delete account?</h2>
                        <p className="text-sm leading-6 text-base-content/70">Delete <span className="font-semibold text-base-content">{userToDelete.name}</span>'s account? This cannot be undone.</p>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => setUserToDelete(null)} className="btn btn-ghost">Cancel</button>
                        <button type="button" onClick={confirmUserDeletion} className="btn btn-primary">Delete account</button>
                    </div>
                </div>}
            </Modal>
        </AuthenticatedLayout>
    );
}

function AccountForm({ user, currentUserId, onClose }: { user: ManagedUser | null; currentUserId: number; onClose: () => void }) {
    const isEditing = user !== null;
    const isCurrentUser = user?.id === currentUserId;
    const { data, setData, post, put, processing, errors } = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        is_super_admin: user?.is_super_admin ?? true,
        send_invitation: !isEditing,
    });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: onClose };

        if (user) {
            put(update(user).url, options);
            return;
        }

        post(store.url(), options);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end overflow-y-auto overscroll-contain bg-slate-950/40 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="account-form-title">
            <form onSubmit={submit} className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl bg-base-100 shadow-xl">
                <header className="flex items-start justify-between gap-4 border-b border-base-300 px-5 py-4 sm:px-6"><div><h2 id="account-form-title" className="text-xl font-bold">{isEditing ? 'Edit account' : 'Add account'}</h2><p className="mt-1 text-sm text-base-content/65">{isEditing ? 'Leave the password blank to keep it unchanged.' : 'An invitation lets the person set their own password.'}</p></div><button type="button" onClick={onClose} className="btn btn-circle btn-ghost btn-sm" aria-label="Close account form">✕</button></header>
                    <div className="grid gap-4 px-5 py-5 sm:px-6">
                    <Field label="Name" error={errors.name}><input value={data.name} onChange={(event) => setData('name', event.target.value)} autoComplete="name" className="input input-bordered mt-1 w-full" /></Field>
                    <Field label="Email address" error={errors.email}><input type="email" value={data.email} onChange={(event) => setData('email', event.target.value)} autoComplete="email" className="input input-bordered mt-1 w-full" /></Field>
                    <div className="grid gap-4 sm:grid-cols-2"><Field label={!isEditing && !data.send_invitation ? 'Temporary password' : 'Temporary password (optional)'} error={errors.password}><input type="password" value={data.password} onChange={(event) => setData('password', event.target.value)} autoComplete="new-password" className="input input-bordered mt-1 w-full" /><span className="mt-2 block text-xs font-normal text-base-content/65">At least 8 characters with uppercase, lowercase, number, and symbol.</span></Field><Field label="Confirm password" error={errors.password_confirmation}><input type="password" value={data.password_confirmation} onChange={(event) => setData('password_confirmation', event.target.value)} autoComplete="new-password" className="input input-bordered mt-1 w-full" /></Field></div>
                    {!isEditing && <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-base-300 p-4"><input type="checkbox" checked={data.send_invitation} onChange={(event) => setData('send_invitation', event.target.checked)} className="checkbox checkbox-primary mt-0.5" /><span><span className="block font-semibold">Send invitation email</span><span className="mt-1 block text-sm text-base-content/65">Sends a secure link so they can set their own password.</span></span></label>}
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-base-300 p-4"><input type="checkbox" checked={data.is_super_admin} disabled={isCurrentUser} onChange={(event) => setData('is_super_admin', event.target.checked)} className="checkbox checkbox-primary mt-0.5" /><span><span className="block font-semibold">Super administrator</span><span className="mt-1 block text-sm text-base-content/65">Can manage bookings and accounts. Administrators receive new-booking notifications.</span>{isCurrentUser && <span className="mt-1 block text-sm text-base-content/65">You cannot remove your own super-admin access.</span>}</span></label>
                </div>
                <footer className="flex justify-end gap-2 border-t border-base-300 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button><button type="submit" disabled={processing} className="btn btn-sm border border-slate-300 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">{processing ? 'Saving…' : isEditing ? 'Save changes' : 'Create account'}</button></footer>
            </form>
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return <label className="block text-sm font-semibold">{label}{children}{error && <span className="mt-1 block text-sm text-error">{error}</span>}</label>;
}

function AccountAccessBadge({ isSuperAdmin }: { isSuperAdmin: boolean }) {
    return isSuperAdmin
        ? <span className="badge border-red-700 bg-red-700 text-white">Super administrator</span>
        : <span className="badge border-slate-300 bg-slate-100 text-slate-700">Administrator</span>;
}

function formatCreatedDate(createdAt: string): string {
    return new Intl.DateTimeFormat('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(createdAt));
}

function Pagination({ users }: { users: Paginator }) {
    if (users.last_page <= 1) return null;

    return <footer className="flex flex-col gap-3 border-t border-base-300 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-base-content/65">Showing {users.from}–{users.to} of {users.total} accounts</p><div className="join">{users.current_page === 1 ? <span className="btn btn-sm join-item btn-disabled">Previous</span> : <Link href={accountIndex.url({ query: { page: users.current_page - 1 } })} preserveScroll className="btn btn-sm join-item">Previous</Link>}<span className="btn btn-sm join-item pointer-events-none">Page {users.current_page} of {users.last_page}</span>{users.current_page === users.last_page ? <span className="btn btn-sm join-item btn-disabled">Next</span> : <Link href={accountIndex.url({ query: { page: users.current_page + 1 } })} preserveScroll className="btn btn-sm join-item">Next</Link>}</div></footer>;
}
