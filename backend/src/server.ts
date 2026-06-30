import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import managerRoutes from './routes/manager';
import examinerRoutes from './routes/examiner';
import studentRoutes from './routes/student';

dotenv.config();

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/examiner', examinerRoutes);
app.use('/api/student', studentRoutes);

// Socket.io for Real-time
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_test', (testId) => {
    socket.join(`test_${testId}`);
    console.log(`Socket ${socket.id} joined test_${testId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
