import expressApp from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import prisma from './prisma';

import authRoutes from './routes/auth';
import managerRoutes from './routes/manager';
import examinerRoutes from './routes/examiner';
import studentRoutes from './routes/student';

const app = expressApp();

app.use(cors());
app.use(expressApp.json({ limit: '50mb' }));
app.use(expressApp.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/examiner', examinerRoutes);
app.use('/api/student', studentRoutes);
app.get('*', async (req, res) => {
  try {
    // Attempt to read the built index.html from dist
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (!fs.existsSync(indexPath)) {
      return res.status(404).send('Not Found');
    }
    
    let html = fs.readFileSync(indexPath, 'utf-8');
    
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    const ogImage = settingsMap['og_image_url'] || '/logo.jpg';
    const seoTitle = settingsMap['seo_title'] || 'Hệ thống chấm thi thực hành lái xe';
    const seoDesc = settingsMap['seo_description'] || 'Hệ thống Quản lý Trung tâm Sát hạch Lái xe';

    html = html.replace(/<title>(.*?)<\/title>/, `<title>${seoTitle}</title>`);
    html = html.replace(/<meta name="description" content="(.*?)" \/>/, `<meta name="description" content="${seoDesc}" />`);
    html = html.replace(/<meta property="og:title" content="(.*?)" \/>/, `<meta property="og:title" content="${seoTitle}" />`);
    html = html.replace(/<meta property="og:description" content="(.*?)" \/>/, `<meta property="og:description" content="${seoDesc}" />`);
    html = html.replace(/<meta property="og:image" content="(.*?)" \/>/, `<meta property="og:image" content="${ogImage}" />`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300'); // Cache for 60s
    res.send(html);
  } catch (error) {
    console.error('Error serving dynamic HTML:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Export for Vercel Serverless
export default app;
