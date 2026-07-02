const fs = require('fs');
let content = fs.readFileSync('api/routes/manager.ts', 'utf8');

const target = `router.post('/settings', async (req, res) => {
  const data = req.body; // Expect an object of key-value pairs
  try {
    const updatePromises = Object.entries(data).map(([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    });
    await Promise.all(updatePromises);


router.post('/upload', upload.single('file'), async (req, res) => {`;

const replacement = `router.post('/settings', async (req, res) => {
  const data = req.body; // Expect an object of key-value pairs
  try {
    const updatePromises = Object.entries(data).map(([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    });
    await Promise.all(updatePromises);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/upload', upload.single('file'), async (req, res) => {`;

content = content.replace(target, replacement);
fs.writeFileSync('api/routes/manager.ts', content);
