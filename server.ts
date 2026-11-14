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
mainApp.use(expressApp.static(distPath));

// 2. API Routes
mainApp.use(apiApp);

// 3. Fallback for all other routes to React SPA (index.html)
mainApp.use((req, res) => {
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
        const lastRun = settings.backup_last_run ? new Date(settings.backup_last_run) : null;
        let lastRunDate = '';
        if (lastRun && !isNaN(lastRun.getTime())) {
          lastRunDate = lastRun.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
        }

        if (vnTimeString === scheduledTime && lastRunDate !== vnDateString) {
          console.log(`[Auto-Backup] Triggering scheduled backup at ${vnTimeString} (${vnDateString})...`);
          await axios.get(`http://127.0.0.1:${port}/api/manager/cron/backup`);
        }
      }
    } catch (err: any) {
      // silently handle background cron tick error
    }
  }, 60000);
});
