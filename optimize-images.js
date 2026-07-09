const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const publicDir = path.join(__dirname, 'public');
  
  // Optimize login-bg.jpg
  const loginBgPath = path.join(publicDir, 'login-bg.jpg');
  if (fs.existsSync(loginBgPath)) {
    const tempPath = path.join(publicDir, 'login-bg-temp.jpg');
    await sharp(loginBgPath)
      .resize(1920) // resize to max width 1920
      .jpeg({ quality: 80, progressive: true })
      .toFile(tempPath);
    fs.renameSync(tempPath, loginBgPath);
    console.log('Optimized login-bg.jpg');
  }

  // Optimize logo.jpg
  const logoPath = path.join(publicDir, 'logo.jpg');
  if (fs.existsSync(logoPath)) {
    const tempPath = path.join(publicDir, 'logo-temp.jpg');
    await sharp(logoPath)
      .resize(500) // max width 500
      .jpeg({ quality: 80, progressive: true })
      .toFile(tempPath);
    fs.renameSync(tempPath, logoPath);
    console.log('Optimized logo.jpg');
  }
}

optimizeImages().catch(console.error);
