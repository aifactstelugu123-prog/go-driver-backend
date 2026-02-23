import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const savedRole = localStorage.getItem('role');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            setRole(savedRole);
        }
        setLoading(false);
    }, []);

    // Single Session & Global Socket Management
    useEffect(() => {
        if (!user?.id || !token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
        setSocket(newSocket);

        // Register so the server knows this is the active socket to watch
        newSocket.emit('register', { userId: user.id, role });

        newSocket.on('auth:force_logout', ({ message }) => {
            alert(message || 'You have been logged in on another device.');
            logout();
            window.location.href = '/login';
        });

        return () => {
            newSocket.disconnect();
            setSocket(null);
        };
    }, [user?.id, token, role]);

    const login = (tokenVal, userVal, roleVal) => {
        localStorage.setItem('token', tokenVal);
        localStorage.setItem('user', JSON.stringify(userVal));
        localStorage.setItem('role', roleVal);
        setToken(tokenVal);
        setUser(userVal);
        setRole(roleVal);
    };

    const updateUser = (newUser) => {
        const merged = { ...user, ...newUser };
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
    };

    const logout = async () => {
        try {
            const { auth } = await import('../config/firebase');
            await auth.signOut();
        } catch (e) {
            console.error('Firebase signout error:', e);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        setToken(null);
        setUser(null);
        setRole(null);

        // Force hard reload to clear all states immediately
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, role, token, loading, socket, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
