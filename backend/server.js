import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import { attachSocketIO } from './middleware/socketMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import healthRecordRoutes from './routes/healthRecordRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import pharmacyRoutes from './routes/pharmacyRoutes.js';
import symptomCheckerRoutes from './routes/symptomCheckerRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000'
].filter(Boolean);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// DB
await connectDB();

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));
app.use(attachSocketIO(io));

// Root Route
app.get('/', (req, res) => {
    res.send('GramSathi Backend Running');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', healthRecordRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/symptom-checker', symptomCheckerRoutes);
app.use('/api/users', userRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User notification room
    socket.on('join-user-room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    // Pharmacy room
    socket.on('join-pharmacy-room', (pharmacyId) => {
        socket.join(`pharmacy_${pharmacyId}`);
        console.log(`Pharmacy ${pharmacyId} joined their room`);
    });

    // WebRTC room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
    });

    // Signaling
    socket.on('signal', ({ roomId, data }) => {
        socket.to(roomId).emit('signal', {
            from: socket.id,
            data
        });
    });

    // Call declined
    socket.on('call-declined', (roomId) => {
        socket.to(roomId).emit('call-declined');
    });

    // Call ended
    socket.on('call-ended', (roomId) => {
        socket.to(roomId).emit('call-ended');
    });

    // Pharmacy stock updates
    socket.on('subscribe-pharmacy-updates', (pharmacyId) => {
        socket.join(`pharmacy-updates-${pharmacyId}`);
        console.log(`Client subscribed to pharmacy ${pharmacyId} updates`);
    });

    socket.on('unsubscribe-pharmacy-updates', (pharmacyId) => {
        socket.leave(`pharmacy-updates-${pharmacyId}`);
        console.log(`Client unsubscribed from pharmacy ${pharmacyId} updates`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});