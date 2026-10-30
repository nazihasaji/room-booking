import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={`btn btn-ghost btn-sm justify-start ${
                active
                    ? 'btn-active'
                    : ''
            } ${className}`}
        >
            {children}
        </Link>
    );
}
