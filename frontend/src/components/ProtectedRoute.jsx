import { Outlet } from 'react-router-dom';

/**
 * Authentication has been removed.
 * All routes are now publicly accessible — this component
 * simply renders nested routes without any auth check.
 */
export default function ProtectedRoute() {
    return <Outlet />;
}
