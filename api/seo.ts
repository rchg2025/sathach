import { Request, Response } from 'express';
import prisma from './_prisma';

export default async function handler(req: Request, res: Response) {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    const ogImage = settingsMap['og_image_url'] || '/logo.jpg';
    const seoTitle = settingsMap['seo_title'] || 'Phần mềm thi sát hạch lái xe ô tô';
    const seoDesc = settingsMap['seo_description'] || 'Phần mềm thi sát hạch lái xe ô tô - Hỗ trợ đăng ký, sắp xếp lịch thi và quản lý dữ liệu học viên tiện lợi.';

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
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).send(html);
  } catch (error) {
    console.error('SEO Function Error:', error);
    res.status(500).send('Internal Server Error');
  }
}
