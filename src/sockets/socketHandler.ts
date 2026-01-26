import cron from 'node-cron';
import { Server, Socket } from 'socket.io';

// Temporary in-memory storage for locks
// Structure: { "showtimeId_seatLabel": { userId: "...", timestamp: 123456789 } }
interface LockData {
    userId: string;
    timestamp: number;
}
const seatLocks: Record<string, LockData> = {};

const LOCK_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

export const initSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        // Handle joining a showtime room to receive updates
        socket.on('join_showtime', (showtimeId: string) => {
            socket.join(showtimeId);
            // Send current locks for this showtime to the user
            const currentLocks = Object.keys(seatLocks)
                .filter(key => key.startsWith(`${showtimeId}_`))
                .map(key => key.split('_')[1]);

            socket.emit('initial_locks', currentLocks);
        });

        socket.on('leave_showtime', (showtimeId: string) => {
            socket.leave(showtimeId);
        });

        // Request to lock a seat
        socket.on('request_lock', ({ showtimeId, seatLabel, userId }) => {
            const lockKey = `${showtimeId}_${seatLabel}`;
            const now = Date.now();

            // Check if already locked
            if (seatLocks[lockKey]) {
                const lock = seatLocks[lockKey];
                // If locked by someone else and not expired
                if (lock.userId !== userId && (now - lock.timestamp < LOCK_EXPIRATION_MS)) {
                    socket.emit('lock_failed', { seatLabel, message: 'Seat is already locked by another user.' });
                    return;
                }
            }

            // Apply lock
            seatLocks[lockKey] = { userId, timestamp: now };

            // Broadcast to everyone else in the room
            socket.to(showtimeId).emit('seat_locked', { seatLabel });

            // Confirm to requester
            socket.emit('lock_success', { seatLabel });
            console.log(`[Socket] Seat locked: ${lockKey} by ${userId}`);
        });

        // Release a lock (e.g. user unselects seat or leaves)
        socket.on('release_lock', ({ showtimeId, seatLabel }) => {
            const lockKey = `${showtimeId}_${seatLabel}`;
            if (seatLocks[lockKey]) {
                delete seatLocks[lockKey];
                socket.to(showtimeId).emit('seat_released', { seatLabel }); // Notify others
                console.log(`[Socket] Seat released: ${lockKey}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
            // Optional: Release locks held by this socket if we tracked socket-to-user mapping
            // For simplicity, we rely on the expiration cron job or explicit release
        });
    });

    // --- CRON JOB (Every Minute) ---
    cron.schedule('* * * * *', () => {
        const now = Date.now();
        let releasedCount = 0;

        Object.keys(seatLocks).forEach(key => {
            if (now - seatLocks[key].timestamp > LOCK_EXPIRATION_MS) {
                delete seatLocks[key];
                releasedCount++;

                // Parse key to notify room
                const [showtimeId, seatLabel] = key.split('_');
                io.to(showtimeId).emit('seat_released', { seatLabel });
            }
        });

        if (releasedCount > 0) {
            console.log(`[Cron] Released ${releasedCount} expired seat locks.`);
        }
    });
};
