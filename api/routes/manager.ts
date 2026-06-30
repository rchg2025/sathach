import { Router } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { uploadFileToDrive, testDriveConnection, getDriveFileStream } from '../utils/drive';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Courses CRUD
router.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.json(courses);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/courses', async (req, res) => {
  const { name, description, startDate, endDate } = req.body;
  try {
    const course = await prisma.course.create({ data: { name, description, startDate: new Date(startDate), endDate: new Date(endDate) } });
    res.json(course);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { isCompleted } = req.body;
  try {
    const data: any = {};
    if (isCompleted !== undefined) data.isCompleted = isCompleted;
    const course = await prisma.course.update({ where: { id: Number(id) }, data });
    res.json(course);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Vehicle Types CRUD
router.get('/vehicle-types', async (req, res) => {
  try {
    const vehicleTypes = await prisma.vehicleType.findMany();
    res.json(vehicleTypes);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/vehicle-types', async (req, res) => {
  const { name, description, seats, brand, owner, manufacturingYear, inspectionExpiry, contractStart, contractEnd } = req.body;
  try {
    const data: any = { name, description };
    if (seats) data.seats = Number(seats);
    if (brand) data.brand = brand;
    if (owner) data.owner = owner;
    if (manufacturingYear) data.manufacturingYear = Number(manufacturingYear);
    if (inspectionExpiry) data.inspectionExpiry = new Date(inspectionExpiry);
    if (contractStart) data.contractStart = new Date(contractStart);
    if (contractEnd) data.contractEnd = new Date(contractEnd);
    
    const vehicleType = await prisma.vehicleType.create({ data });
    res.json(vehicleType);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/vehicle-types/:id', async (req, res) => {
  const { id } = req.params;
  const { isActive, manufacturingYear, inspectionExpiry } = req.body;
  try {
    const data: any = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (manufacturingYear) data.manufacturingYear = Number(manufacturingYear);
    if (inspectionExpiry) data.inspectionExpiry = new Date(inspectionExpiry);
    const vehicleType = await prisma.vehicleType.update({ where: { id: Number(id) }, data });
    res.json(vehicleType);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Test Types CRUD
router.get('/test-types', async (req, res) => {
  try {
    const testTypes = await prisma.testType.findMany({ include: { criteria: true } });
    res.json(testTypes);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/test-types', async (req, res) => {
  const { name, description } = req.body;
  try {
    const testType = await prisma.testType.create({ data: { name, description } });
    res.json(testType);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Criteria CRUD
router.post('/criteria', async (req, res) => {
  const { name, pointsToDeduct, testTypeId } = req.body;
  try {
    const criterion = await prisma.criterion.create({ data: { name, pointsToDeduct: Number(pointsToDeduct), testTypeId: Number(testTypeId) } });
    res.json(criterion);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Students
router.post('/students', async (req, res) => {
  const { cccd, name, dob, courseId } = req.body;
  try {
    const student = await prisma.student.create({ data: { cccd, name, dob, courseId: Number(courseId) } });
    res.json(student);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({ include: { course: true } });
    res.json(students);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Assign Examiner
router.post('/assignments', async (req, res) => {
  const { examinerId, testTypeId, courseId } = req.body;
  try {
    const assignment = await prisma.testAssignment.create({ data: { examinerId, testTypeId, courseId } });
    res.json(assignment);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Users Management
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { username: { not: 'quantri' } },
      select: { id: true, username: true, role: true, name: true, phone: true, email: true, isActive: true, avatarUrl: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/users', async (req, res) => {
  const { username, password, role, name, phone, email, avatarUrl } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: passwordHash, role, name, phone, email, avatarUrl }
    });
    res.json({ id: user.id, username: user.username, role: user.role, name: user.name, phone: user.phone, email: user.email, isActive: user.isActive, avatarUrl: user.avatarUrl });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: { id: true, username: true, role: true, name: true, phone: true, email: true, isActive: true, avatarUrl: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, isActive, password, phone, email, avatarUrl } = req.body;
  try {
    const data: any = { name, role, isActive, phone, email, avatarUrl };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data
    });
    res.json({ id: user.id, username: user.username, role: user.role, name: user.name, phone: user.phone, email: user.email, isActive: user.isActive, avatarUrl: user.avatarUrl });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    res.json(settingsMap);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/settings', async (req, res) => {
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

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = await uploadFileToDrive(req.file);
    res.json({ url: fileUrl });
  } catch (error: any) {
    console.error('Upload Error:', error.message);
    res.status(500).json({ error: error.message || 'Server error during file upload' });
  }
});

router.post('/test-drive', async (req, res) => {
  const { clientEmail, privateKey, folderId } = req.body;
  if (!clientEmail || !privateKey || !folderId) {
    return res.status(400).json({ error: 'Thiếu thông tin cấu hình' });
  }
  
  try {
    await testDriveConnection(clientEmail, privateKey, folderId);
    res.json({ success: true, message: 'Kết nối Google Drive thành công!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/drive/image/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { stream, mimeType } = await getDriveFileStream(fileId);
    
    // Set headers to cache the image and provide the correct content type
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    // Pipe the stream directly to the response
    stream.pipe(res);
  } catch (error: any) {
    console.error('Drive Image Proxy Error:', error.message);
    res.status(404).send('Image not found');
  }
});

export default router;
