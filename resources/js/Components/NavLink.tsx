import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active: boolean }) {
    return (
        <Link
            {...props}
            className={
                'btn btn-sm btn-ghost ' +
                (active
                    ? 'btn-active'
                    : '') + ' ' +
                className
            }
        >
            {children}
        </Link>
    );
}
