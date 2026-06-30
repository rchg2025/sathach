import { Router } from 'express';
import prisma from '../prisma';

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

export default router;
