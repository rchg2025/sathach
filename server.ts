import expressApp from 'express';
import cors from 'cors';
import path from 'path';
import apiApp from './api/index';
import axios from 'axios';

const port = process.env.PORT || 4000;
const distPath = path.join(__dirname, 'dist');
const mainApp = expressApp();

mainApp.use(cors());

// 1. Static assets from dist folder
// For hashed assets in /assets, allow long cache. For index.html, never cache!
mainApp.use('/assets', expressApp.static(path.join(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true
}));

mainApp.use(expressApp.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// 2. API Routes
mainApp.use(apiApp);

// 3. Fallback for all other routes to React SPA (index.html) with NO-CACHE headers
mainApp.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

mainApp.listen(port, () => {
  console.log(`Sathach server is listening on port ${port}`);

  // Internal Cron Runner: check backup schedule every 60 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      // Format VN time HH:mm
      const vnTimeString = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: '2-digit', minute: '2-digit' });
      const vnDateString = now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); // YYYY-MM-DD

      const resSettings = await axios.get(`http://127.0.0.1:${port}/api/manager/settings`);
      const settings = resSettings.data || {};

      if (settings.backup_schedule_enabled === 'true') {
        const scheduledTime = settings.backup_schedule_time || '02:00';
        const cycle = settings.backup_schedule_cycle || 'daily';
        const lastRun = settings.backup_last_run ? new Date(settings.backup_last_run) : null;
        let lastRunDate = '';
        if (lastRun && !isNaN(lastRun.getTime())) {
          lastRunDate = lastRun.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
        }

        // Time of day matches and has not run today yet
        if (vnTimeString === scheduledTime && lastRunDate !== vnDateString) {
          // Check cycle condition:
          let shouldRun = false;
          const vnDateObj = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
          const currentDayOfWeek = String(vnDateObj.getDay()); // 0 = Sunday, 1 = Monday, ...
          const currentDayOfMonth = String(vnDateObj.getDate());
          const currentMonth = vnDateObj.getMonth() + 1; // 1..12

          if (cycle === 'daily') {
            shouldRun = true;
          } else if (cycle === 'weekly') {
            const targetDay = settings.backup_schedule_day_of_week || '1';
            if (currentDayOfWeek === targetDay) shouldRun = true;
          } else if (cycle === 'monthly') {
            const targetDay = settings.backup_schedule_day_of_month || '1';
            if (currentDayOfMonth === targetDay) shouldRun = true;
          } else if (cycle === 'quarterly') {
            const targetDay = settings.backup_schedule_day_of_month || '1';
            const isQuarterStartMonth = [1, 4, 7, 10].includes(currentMonth);
            if (isQuarterStartMonth && currentDayOfMonth === targetDay) shouldRun = true;
          }

          if (shouldRun) {
            console.log(`[Auto-Backup] Triggering ${cycle} backup at ${vnTimeString} (${vnDateString})...`);
            await axios.get(`http://127.0.0.1:${port}/api/manager/cron/backup`);
          }
        }
      }
    } catch (err: any) {
      // silently handle background cron tick error
    }
  }, 60000);
});
