// Authentication removed — redirect to the main app.
import { Navigate } from 'react-router-dom';
export default function Login() {
    return <Navigate to="/dashboard" replace />;
}
