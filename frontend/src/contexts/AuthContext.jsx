import { createContext, useContext } from 'react';

/**
 * Authentication has been removed.
 * This stub keeps the shape of the old context so any remaining
 * imports of `useAuth` won't break — they simply receive null values.
 */
const AuthContext = createContext({ session: null, user: null, loading: false });

export function AuthProvider({ children }) {
    return (
        <AuthContext.Provider value={{ session: null, user: null, loading: false }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
