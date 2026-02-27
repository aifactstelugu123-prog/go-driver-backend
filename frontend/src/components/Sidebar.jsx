import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ownerNav = [
    { to: '/owner', label: 'Dashboard', icon: '🏠' },
    { to: '/owner/vehicles', label: 'My Vehicles', icon: '🚗' },
    { to: '/owner/create-ride', label: 'Book Driver', icon: '➕' },
    { to: '/owner/rides', label: 'Ride History', icon: '📋' },
    { to: '/owner/wallet', label: 'My Wallet', icon: '💰' },
    { to: '/owner/profile', label: 'My Profile', icon: '👤' },
    { to: '/owner/rto-exam', label: 'Go Driver Exam', icon: '📝' },
];

const driverNav = [
    { to: '/driver', label: 'Dashboard', icon: '🏠' },
    { to: '/driver/subscription', label: 'Subscription', icon: '💎' },
    { to: '/driver/training', label: 'Training', icon: '🎓' },
    { to: '/driver/wallet', label: 'My Wallet', icon: '💰' },
    { to: '/driver/profile', label: 'My Profile', icon: '👤' },
    { to: '/driver/rto-exam', label: 'Go Driver Exam', icon: '📝' },
];

const adminNav = [
    { to: '/admin', label: 'Dashboard', icon: '📊' },
    { to: '/admin/drivers', label: 'Drivers', icon: '🧑‍✈️' },
    { to: '/admin/owners', label: 'Owners', icon: '👥' },
    { to: '/admin/orders', label: 'Orders', icon: '📋' },
    { to: '/admin/violations', label: 'Speed Violations', icon: '⚠️' },
    { to: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
    { to: '/admin/payouts', label: 'Payouts', icon: '💸' },
    { to: '/admin/earnings', label: 'Platform Earnings', icon: '💼' },
];

const roleTitles = { owner: 'Vehicle Owner', driver: 'Driver Portal', admin: 'Admin Panel' };

export default function Sidebar() {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();
    const [imageError, setImageError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const navItems = role === 'owner' ? ownerNav : role === 'driver' ? driverNav : adminNav;

    const handleLogout = async () => {
        await logout();
    };

    // Auto-close sidebar on mobile when navigating
    const handleNavClick = () => {
        if (window.innerWidth <= 768) {
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Mobile Header / Hamburger Menu */}
            <div className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #00d4aa, #00a882)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🚗</div>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Go Driver</span>
                </div>
                <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Overlay for mobile to close sidebar when clicking outside */}
            {isOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90, backdropFilter: 'blur(2px)' }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 36, height: 36, background: 'linear-gradient(135deg, #00d4aa, #00a882)',
                            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                        }}>🚗</div>
                        <div>
                            <h2>Go Driver</h2>
                            <span>{roleTitles[role]}</span>
                        </div>
                    </div>
                </div>

                <div className="sidebar-nav">
                    <div className="sidebar-section-title">Navigation</div>
                    {navItems.map(({ to, label, icon }) => (
                        <NavLink key={to} to={to} end={to.split('/').length <= 2}
                            onClick={handleNavClick}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <span className="nav-icon">{icon}</span>
                            {label}
                        </NavLink>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar" style={{ overflow: 'hidden' }}>
                            {user?.profilePhoto && !imageError ? (
                                <img
                                    src={user.profilePhoto.startsWith('http')
                                        ? user.profilePhoto
                                        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${user.profilePhoto}`
                                    }
                                    alt=""
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                (user?.name || user?.email || 'A')[0].toUpperCase()
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.name || user?.email || 'Admin'}
                            </div>
                            <div className="user-role">{role}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }}>
                        🚪 Logout
                    </button>
                </div>
            </nav>
        </>
    );
}
