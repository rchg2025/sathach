import expressApp from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import prisma from './prisma';

import authRoutes from './routes/auth';
import managerRoutes from './routes/manager';
import examinerRoutes from './routes/examiner';
import studentRoutes from './routes/student';
import trainingGroundsRoutes from './routes/trainingGrounds';
import trainingShiftsRoutes from './routes/trainingShifts';

const app = expressApp();

app.use(cors());
app.use(expressApp.json({ limit: '50mb' }));
app.use(expressApp.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/manager/training-grounds', trainingGroundsRoutes);
app.use('/api/manager/training-shifts', trainingShiftsRoutes);
app.use('/api/examiner', examinerRoutes);
app.use('/api/student', studentRoutes);
app.get('/api/seo-bot', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    const ogImage = settingsMap['og_image_url'] || '/logo.jpg';
    const seoTitle = settingsMap['seo_title'] || 'Hệ thống chấm thi thực hành lái xe';
    const seoDesc = settingsMap['seo_description'] || 'Hệ thống Quản lý Trung tâm Sát hạch Lái xe';

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>${seoTitle}</title>
    <meta name="description" content="${seoDesc}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${seoTitle}">
    <meta property="og:description" content="${seoDesc}">
    <meta property="og:image" content="${ogImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${seoTitle}">
    <meta name="twitter:description" content="${seoDesc}">
    <meta name="twitter:image" content="${ogImage}">
</head>
<body>
    <script>window.location.href = "/";</script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300'); // Cache for 60s
    res.send(html);
  } catch (error) {
    console.error('Error serving SEO HTML:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Export for Vercel Serverless
export default app;
