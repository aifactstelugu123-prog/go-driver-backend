import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PermissionGuard from './components/PermissionGuard';

// Auth Pages
import Login from './pages/auth/Login';
import DriverRegister from './pages/driver/Register';

// Owner Pages
import OwnerDashboard from './pages/owner/Dashboard';
import Vehicles from './pages/owner/Vehicles';
import CreateRide from './pages/owner/CreateRide';
import OwnerRides from './pages/owner/Rides';
import ActiveRide from './pages/owner/ActiveRide';
import OwnerWallet from './pages/owner/Wallet';
import OwnerProfile from './pages/owner/Profile';

// Driver Pages
import DriverDashboard from './pages/driver/Dashboard';
import DriverSubscription from './pages/driver/Subscription';
import DriverTraining from './pages/driver/Training';
import DriverActiveRide from './pages/driver/ActiveRide';
import DriverWallet from './pages/driver/Wallet';
import DriverProfile from './pages/driver/Profile';
import RTOExam from './pages/driver/RTOExam';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminDrivers from './pages/admin/Drivers';
import AdminOrders from './pages/admin/Orders';
import AdminViolations from './pages/admin/Violations';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminPayouts from './pages/admin/Payouts';
import AdminEarnings from './pages/admin/Earnings';
import AdminOwners from './pages/admin/Owners';
import AdminOwnerDetail from './pages/admin/OwnerDetail';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { role, loading } = useAuth();
    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading...</p></div>;
    if (!role) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" replace />;

    // Only request location/camera permissions for Driver & Owner (Admin doesn't need them)
    if (role === 'admin') return children;

    return <PermissionGuard>{children}</PermissionGuard>;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register/driver" element={<DriverRegister />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* Owner */}
                    <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
                    <Route path="/owner/vehicles" element={<ProtectedRoute allowedRoles={['owner']}><Vehicles /></ProtectedRoute>} />
                    <Route path="/owner/create-ride" element={<ProtectedRoute allowedRoles={['owner']}><CreateRide /></ProtectedRoute>} />
                    <Route path="/owner/rides" element={<ProtectedRoute allowedRoles={['owner']}><OwnerRides /></ProtectedRoute>} />
                    <Route path="/owner/rides/:id" element={<ProtectedRoute allowedRoles={['owner']}><ActiveRide /></ProtectedRoute>} />
                    <Route path="/owner/wallet" element={<ProtectedRoute allowedRoles={['owner']}><OwnerWallet /></ProtectedRoute>} />
                    <Route path="/owner/profile" element={<ProtectedRoute allowedRoles={['owner']}><OwnerProfile /></ProtectedRoute>} />
                    <Route path="/owner/rto-exam" element={<ProtectedRoute allowedRoles={['owner', 'driver']}><RTOExam /></ProtectedRoute>} />

                    {/* Driver */}
                    <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>} />
                    <Route path="/driver/subscription" element={<ProtectedRoute allowedRoles={['driver']}><DriverSubscription /></ProtectedRoute>} />
                    <Route path="/driver/training" element={<ProtectedRoute allowedRoles={['driver']}><DriverTraining /></ProtectedRoute>} />
                    <Route path="/driver/ride/:id" element={<ProtectedRoute allowedRoles={['driver']}><DriverActiveRide /></ProtectedRoute>} />
                    <Route path="/driver/wallet" element={<ProtectedRoute allowedRoles={['driver']}><DriverWallet /></ProtectedRoute>} />
                    <Route path="/driver/profile" element={<ProtectedRoute allowedRoles={['driver']}><DriverProfile /></ProtectedRoute>} />
                    <Route path="/driver/rto-exam" element={<ProtectedRoute allowedRoles={['driver']}><RTOExam /></ProtectedRoute>} />

                    {/* Admin */}
                    <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/drivers" element={<ProtectedRoute allowedRoles={['admin']}><AdminDrivers /></ProtectedRoute>} />
                    <Route path="/admin/owners" element={<ProtectedRoute allowedRoles={['admin']}><AdminOwners /></ProtectedRoute>} />
                    <Route path="/admin/owners/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminOwnerDetail /></ProtectedRoute>} />
                    <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
                    <Route path="/admin/violations" element={<ProtectedRoute allowedRoles={['admin']}><AdminViolations /></ProtectedRoute>} />
                    <Route path="/admin/subscriptions" element={<ProtectedRoute allowedRoles={['admin']}><AdminSubscriptions /></ProtectedRoute>} />
                    <Route path="/admin/payouts" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayouts /></ProtectedRoute>} />
                    <Route path="/admin/earnings" element={<ProtectedRoute allowedRoles={['admin']}><AdminEarnings /></ProtectedRoute>} />

                    {/* 404 */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
