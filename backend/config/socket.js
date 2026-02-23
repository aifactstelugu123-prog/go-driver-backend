const SpeedViolation = require('../models/SpeedViolation');
const Order = require('../models/Order');
const Driver = require('../models/Driver');
const Owner = require('../models/Owner');
const { MAX_SPEED_KMH } = require('../config/constants');

// In-memory maps: driverId -> socketId, ownerId -> socketId
const driverSockets = new Map();
const ownerSockets = new Map();

const initSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // ─── REGISTER ROLE ──────────────────────────────────────
        socket.on('register', async ({ userId, role }) => {
            try {
                let userModel;
                if (role === 'driver') userModel = Driver;
                else if (role === 'owner') userModel = Owner;

                if (userModel) {
                    const user = await userModel.findById(userId);
                    if (user) {
                        // Single Session Enforcement
                        if (user.activeSocketId && user.activeSocketId !== socket.id) {
                            console.log(`⚠️ Forcing logout for ${role} ${userId} on old socket ${user.activeSocketId}`);
                            io.to(user.activeSocketId).emit('auth:force_logout', {
                                message: 'You have been logged in on another device or tab.'
                            });
                            // Optional: disconnect the old socket
                            const oldSocket = io.sockets.sockets.get(user.activeSocketId);
                            if (oldSocket) oldSocket.disconnect();
                        }
                        // Update using findByIdAndUpdate to bypass heavy validation
                        await userModel.findByIdAndUpdate(userId, { activeSocketId: socket.id });
                    }
                }

                if (role === 'driver') {
                    driverSockets.set(userId, socket.id);
                    socket.join(`driver_${userId}`);
                    console.log(`🚗 Driver ${userId} registered on socket ${socket.id}`);
                } else if (role === 'owner') {
                    ownerSockets.set(userId, socket.id);
                    socket.join(`owner_${userId}`);
                    console.log(`👤 Owner ${userId} registered on socket ${socket.id}`);
                } else if (role === 'admin') {
                    socket.join('admin_room');
                    console.log(`🛡️ Admin connected`);
                }
            } catch (err) {
                console.error('Socket register error:', err.message);
            }
        });

        // ─── BROADCAST NEW RIDE TO DRIVERS ──────────────────────
        // Emitted by: owner/admin after creating order
        // ride object must include: orderId, vehicleType, pickupLocation, dropLocation, ownerName, scheduledDate, fare
        socket.on('ride:broadcast', async ({ ride, targetDriverIds }) => {
            try {
                // Fetch owner details to include in broadcast
                const owner = await Owner.findById(ride.ownerId).select('profilePhoto rating');
                if (owner) {
                    ride.ownerPhoto = owner.profilePhoto;
                    ride.ownerRating = owner.rating || 5;
                }

                if (targetDriverIds && targetDriverIds.length) {
                    // Send to specific drivers
                    for (const dId of targetDriverIds) {
                        const sid = driverSockets.get(dId);
                        if (sid) io.to(sid).emit('ride:new_assignment', ride);
                    }
                } else {
                    // Broadcast to ALL online approved drivers with matching vehicle skill
                    const matchingDrivers = await Driver.find({
                        isApproved: true,
                        isBlocked: false,
                        isOnline: true,
                        vehicleSkills: ride.vehicleType,
                    }).select('_id');
                    for (const d of matchingDrivers) {
                        const sid = driverSockets.get(d._id.toString());
                        if (sid) io.to(sid).emit('ride:new_assignment', ride);
                    }
                }
            } catch (err) {
                console.error('ride:broadcast error:', err.message);
            }
        });


        // ─── DRIVER LOCATION UPDATE ─────────────────────────────
        socket.on('driver:location', async ({ driverId, orderId, lat, lng, speed }) => {
            try {
                // 1. Update Driver's live position (Fire and forget, or combine later)
                // We only do this occasionally or keep in memory if performance is critical
                // For now, let's keep it but maybe optimize by only updating if changed significantly
                Driver.findByIdAndUpdate(driverId, {
                    currentLocation: { lat, lng, updatedAt: new Date() },
                    isOnline: true,
                }).catch(e => console.error('Driver loc update failed:', e.message));

                if (!orderId) return;

                // 2. Fetch Order once to get ownerId and current status
                const order = await Order.findById(orderId).select('ownerId vehicleType status');
                if (!order) return;

                // 3. Save to route history
                await Order.findByIdAndUpdate(orderId, {
                    $push: { routeHistory: { lat, lng, speed, timestamp: new Date() } },
                });

                // 4. Broadcast to owner for live map
                const ownerSid = ownerSockets.get(order.ownerId.toString());
                if (ownerSid) {
                    io.to(ownerSid).emit('driver:location', { driverId, lat, lng, speed });
                }

                // 5. Emit to admin panel
                io.to('admin_room').emit('driver:location', { driverId, orderId, lat, lng, speed });

                // ─── REACHED CHECK (If within 200m of pickup) ──
                if (order.status === 'Accepted') {
                    const { haversineDistance } = require('../services/matchingEngine');
                    const dist = haversineDistance(
                        { lat, lng },
                        { lat: order.pickupLocation.lat, lng: order.pickupLocation.lng }
                    );
                    if (dist <= 0.2) { // 200 meters
                        if (ownerSid) {
                            io.to(ownerSid).emit('ride:driver_reached', { message: 'Driver reached your location' });
                        }
                        io.to('admin_room').emit('ride:driver_reached', { driverId, orderId });
                    }
                }

                // 6. Speed violation check
                if (speed > MAX_SPEED_KMH) {
                    const violation = await SpeedViolation.create({
                        orderId,
                        driverId,
                        ownerId: order.ownerId,
                        speed,
                        maxAllowed: MAX_SPEED_KMH,
                        location: { lat, lng },
                        notifiedOwner: !!ownerSid,
                        notifiedAdmin: true,
                    });

                    await Driver.findByIdAndUpdate(driverId, { $inc: { speedViolationCount: 1 } });

                    if (ownerSid) {
                        io.to(ownerSid).emit('speed:violation', {
                            speed,
                            maxAllowed: MAX_SPEED_KMH,
                            message: `⚠️ Driver exceeding safe speed limit! Current speed: ${speed} km/h`,
                        });
                    }

                    io.to('admin_room').emit('speed:violation', {
                        driverId, orderId, speed, location: { lat, lng }, violationId: violation._id
                    });

                    socket.emit('speed:warning', {
                        speed, maxAllowed: MAX_SPEED_KMH,
                        message: `Slow down! You are driving at ${speed} km/h. Max allowed: ${MAX_SPEED_KMH} km/h`,
                    });
                }
            } catch (err) {
                console.error('Socket driver:location error:', err.message);
            }
        });

        // ─── DISCONNECTION ──────────────────────────────────────
        socket.on('disconnect', () => {
            // Remove from maps
            for (const [userId, sid] of driverSockets.entries()) {
                if (sid === socket.id) {
                    driverSockets.delete(userId);
                    Driver.findByIdAndUpdate(userId, { isOnline: false }).catch(() => { });
                    console.log(`🔴 Driver ${userId} disconnected`);
                    break;
                }
            }
            for (const [userId, sid] of ownerSockets.entries()) {
                if (sid === socket.id) {
                    ownerSockets.delete(userId);
                    console.log(`🔴 Owner ${userId} disconnected`);
                    break;
                }
            }
        });
    });
};

module.exports = { initSocket, driverSockets, ownerSockets };
