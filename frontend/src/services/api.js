import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach JWT token to requests
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 (token expired)
API.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ─── AUTH ─────────────────────────────────────
export const sendOwnerOtp = (data) => API.post('/auth/owner/send-otp', data);
export const verifyOwnerOtp = (data) => API.post('/auth/owner/verify-otp', data);
export const sendDriverOtp = (data) => API.post('/auth/driver/send-otp', data);
export const verifyDriverOtp = (data) => API.post('/auth/driver/verify-otp', data);
export const adminLogin = (data) => API.post('/auth/admin/login', data);
export const acceptTnC = () => API.put('/auth/accept-tnc');

// ─── OWNER ────────────────────────────────────
export const getOwnerProfile = () => API.get('/owner/profile');
export const getVehicles = () => API.get('/owner/vehicles');
export const getHourlyRates = () => API.get('/owner/hourly-rates');
export const addVehicle = (data) => API.post('/owner/vehicles', data);
export const updateVehicle = (id, data) => API.put(`/owner/vehicles/${id}`, data);
export const deleteVehicle = (id) => API.delete(`/owner/vehicles/${id}`);
export const createRide = (data) => API.post('/owner/rides', data);
export const getOwnerRides = () => API.get('/owner/rides');
export const getOwnerRideById = (id) => API.get(`/owner/rides/${id}`);
export const generateStartOtp = (id) => API.post(`/owner/rides/${id}/start-otp`);
export const generateEndOtp = (id) => API.post(`/owner/rides/${id}/end-otp`);
export const cancelRide = (id, data) => API.post(`/owner/rides/${id}/cancel`, data);

// ─── DRIVER ───────────────────────────────────
export const registerDriver = (formData) => API.post('/driver/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
});
export const getDriverProfile = () => API.get('/driver/profile');
export const updateDriverLocation = (data) => API.put('/driver/location', data);
export const setDriverOnline = () => API.put('/driver/online');
export const setDriverOffline = () => API.put('/driver/offline');
export const claimFreeTrial = () => API.post('/driver/claim-free-trial');
export const getSubscriptionStatus = () => API.get('/driver/subscription-status');
export const submitQuizComplete = (data) => API.post('/driver/quiz-complete', data);

// ─── RIDES ────────────────────────────────────
export const acceptRide = (id) => API.post(`/rides/${id}/accept`);
export const startRide = (id, data) => API.post(`/rides/${id}/start`, data);
export const endRide = (id, data) => API.post(`/rides/${id}/end`, data);
export const getRideById = (id) => API.get(`/rides/${id}`);

// ─── SUBSCRIPTION ─────────────────────────────
export const getPlans = () => API.get('/subscription/plans');
export const createSubscriptionOrder = (data) => API.post('/subscription/create-order', data);
export const verifySubscriptionPayment = (data) => API.post('/subscription/verify', data);

// ─── TRAINING ─────────────────────────────────
export const getTrainingModules = () => API.get('/training');
export const getTrainingModule = (id) => API.get(`/training/${id}`);
export const getWeeklyTraining = () => API.get('/training/weekly');
export const submitQuiz = (id, data) => API.post(`/training/${id}/submit`, data);

// ─── ADMIN ────────────────────────────────────
export const getAdminDrivers = (params) => API.get('/admin/drivers', { params });
export const approveDriver = (id) => API.put(`/admin/drivers/${id}/approve`);
export const blockDriver = (id) => API.put(`/admin/drivers/${id}/block`);
export const unblockDriver = (id) => API.put(`/admin/drivers/${id}/unblock`);
export const getAdminOwners = () => API.get('/admin/owners');
export const getAdminOwnerById = (id) => API.get(`/admin/owners/${id}`);
export const getAdminOrders = (params) => API.get('/admin/orders', { params });
export const getAdminViolations = () => API.get('/admin/violations');
export const getAdminSubscriptions = () => API.get('/admin/subscriptions');
export const getAnalytics = () => API.get('/admin/analytics');

// ─── WALLET ───────────────────────────────────
export const getWallet = () => API.get('/wallet');
export const createWalletRecharge = (data) => API.post('/wallet/recharge', data);
export const verifyWalletRecharge = (data) => API.post('/wallet/recharge/verify', data);
export const payRideFromWallet = (data) => API.post('/wallet/pay-ride', data);
export const createDriverRecharge = (data) => API.post('/driver-wallet/recharge', data);
export const verifyDriverRecharge = (data) => API.post('/driver-wallet/recharge/verify', data);

export default API;

