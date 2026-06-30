import expressApp from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import managerRoutes from './routes/manager';
import examinerRoutes from './routes/examiner';
import studentRoutes from './routes/student';

const app = expressApp();

app.use(cors());
app.use(expressApp.json());

app.use('/api/auth', authRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/examiner', examinerRoutes);
app.use('/api/student', studentRoutes);

// Export for Vercel Serverless
export default app;
