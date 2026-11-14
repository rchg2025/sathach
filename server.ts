import expressApp from 'express';
import cors from 'cors';
import path from 'path';
import apiApp from './api/index';

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
});
