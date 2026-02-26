require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const connectDB = require('./config/db');
const { initSocket, driverSockets, ownerSockets } = require('./config/socket');

// Routes
const authRoutes = require('./routes/auth');
const ownerRoutes = require('./routes/owner');
const driverRoutes = require('./routes/driver');
const adminRoutes = require('./routes/admin');
const ridesRoutes = require('./routes/rides');
const subscriptionRoutes = require('./routes/subscription');
const trainingRoutes = require('./routes/training');
const walletRoutes = require('./routes/wallet');
const driverWalletRoutes = require('./routes/driverWallet');
const profileRoutes = require('./routes/profile');
const rtoRoutes = require('./routes/rto');
const { adminIpGuard } = require('./middleware/adminIpGuard');

// Connect DB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

// Share io + socket maps via app
app.set('io', io);
app.set('driverSocket', driverSockets);
app.set('ownerSocket', ownerSockets);

// Init socket handlers
initSocket(io);

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "http://localhost:5000", "http://localhost:5173", "https://go-driver-7a978.web.app", "https://go-driver-7a978.firebaseapp.com", "https://*.googleusercontent.com", "https://firebasestorage.googleapis.com", "https://upload.wikimedia.org", "https://*.youtube.com", "https://*.ytimg.com"],
            "frame-src": ["'self'", "https://www.youtube.com", "https://*.youtube.com"],
        },
    },
}));
const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://192.168.31.12:5173',
    'http://192.168.31.12:5174',
    'http://192.168.31.12:5175',
    'https://go-driver-7a978.web.app',
    'https://go-driver-7a978.firebaseapp.com',
    'https://godriverbackend.loca.lt'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow if no origin (mobile apps/CURL) or if in whitelist
        // For mobile browser debugging, we also allow 192.168.x.x LAN IPs
        const isLan = origin && /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);
        if (!origin || allowedOrigins.includes(origin) || isLan) {
            callback(null, true);
        } else {
            console.warn(`[CORS BLOCKED] Origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug Middleware: Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} (Origin: ${req.headers.origin || 'No Origin'})`);
    next();
});

// Serve Frontend (Vite build)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/driver-wallet', driverWalletRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/rto', rtoRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Driver-as-a-Service API running 🚀', timestamp: new Date() });
});

// 404 handler (ignore for SPA)
// app.use((req, res) => {
//     res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
// });

// SPA Fallback: Send index.html for any unknown routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
