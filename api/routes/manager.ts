import { Router } from 'express';
import nodemailer from 'nodemailer';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { uploadFileToDrive, testDriveConnection, getDriveFileStream } from '../utils/drive';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalStudents = await prisma.student.count();
    const totalCourses = await prisma.course.count();
    const totalTestTypes = await prisma.testType.count();
    const activeExaminers = await prisma.user.count({
      where: { role: 'EXAMINER', isActive: true }
    });

    const passed = await prisma.testResult.count({ where: { status: 'PASSED' } });
    const failed = await prisma.testResult.count({ where: { status: 'FAILED' } });

    const allStudents = await prisma.student.findMany({ select: { createdAt: true } });
    const monthlyData: Record<string, number> = {};
    allStudents.forEach(s => {
      const month = s.createdAt.getMonth() + 1;
      const year = s.createdAt.getFullYear();
      const monthYear = `Th${month}/${year.toString().slice(2)}`;
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
    });
    
    const traffic = Object.entries(monthlyData).map(([name, value]) => ({ name, value })).slice(-6);

    const recentStudentsData = await prisma.testResult.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { include: { course: true } }
      }
    });

    const recentStudents = recentStudentsData.map(tr => ({
      id: tr.id,
      studentName: tr.student.name,
      courseName: tr.student.course?.name || tr.student.courseName || 'N/A',
      time: tr.endTime || tr.updatedAt,
      status: tr.status
    }));

    const topExaminersData = await prisma.examProgress.groupBy({
      by: ['examinerId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    const topExaminers = await Promise.all(topExaminersData.map(async (te) => {
      const user = await prisma.user.findUnique({ where: { id: te.examinerId } });
      const assignment = await prisma.testAssignment.findFirst({
        where: { examinerId: te.examinerId },
        include: { testType: true }
      });
      return {
        id: te.examinerId,
        name: user?.name || 'Unknown',
        gradedCount: te._count.id,
        testTypeName: assignment?.testType?.name || 'N/A'
      };
    }));

    res.json({
      totalStudents,
      totalCourses,
      totalTestTypes,
      activeExaminers,
      passFail: [
        { name: 'Đậu (Passed)', value: passed },
        { name: 'Rớt (Failed)', value: failed }
      ],
      traffic,
      recentStudents,
      topExaminers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Courses CRUD
router.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: {
          select: { students: true }
        }
      }
    });
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
  const { isCompleted, name, description, startDate, endDate } = req.body;
  try {
    const data: any = {};
    if (isCompleted !== undefined) data.isCompleted = isCompleted;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    const course = await prisma.course.update({ where: { id: Number(id) }, data });
    res.json(course);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/courses/:id', async (req, res) => {
  const { username } = req.query;
  const id = Number(req.params.id);
  try {
    if (username === 'quantri') {
      const students = await prisma.student.findMany({ where: { courseId: id } });
      const studentIds = students.map(s => s.id);
      const testResults = await prisma.testResult.findMany({ where: { studentId: { in: studentIds } } });
      const trIds = testResults.map(tr => tr.id);
      
      await prisma.score.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.examProgress.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.testResult.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.student.deleteMany({ where: { courseId: id } });
      await prisma.testAssignment.deleteMany({ where: { courseId: id } });
      
      await prisma.course.delete({ where: { id } });
      res.json({ success: true, message: `Đã xoá khoá học cùng với ${students.length} học viên và các dữ liệu liên quan.` });
    } else {
      await prisma.course.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá khoá học' });
    }
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
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

router.post('/vehicle-types/bulk-import', async (req, res) => {
  const { vehicles } = req.body;
  if (!Array.isArray(vehicles)) return res.status(400).json({ error: 'Invalid data' });

  let successCount = 0;
  let errorCount = 0;

  for (const v of vehicles) {
    try {
      const { name, description, seats, brand, owner, manufacturingYear, inspectionExpiry, contractStart, contractEnd } = v;
      if (!name) {
        errorCount++;
        continue;
      }

      const data: any = { name: String(name), description: description || '' };
      if (seats) data.seats = Number(seats);
      if (brand) data.brand = String(brand);
      if (owner) data.owner = String(owner);
      if (manufacturingYear) data.manufacturingYear = Number(manufacturingYear);
      
      // handle dates
      if (inspectionExpiry && !isNaN(new Date(inspectionExpiry).getTime())) {
        data.inspectionExpiry = new Date(inspectionExpiry);
      }
      if (contractStart && !isNaN(new Date(contractStart).getTime())) {
        data.contractStart = new Date(contractStart);
      }
      if (contractEnd && !isNaN(new Date(contractEnd).getTime())) {
        data.contractEnd = new Date(contractEnd);
      }

      const existing = await prisma.vehicleType.findFirst({ where: { name: String(name) } });
      if (existing) {
        await prisma.vehicleType.update({ where: { id: existing.id }, data });
      } else {
        await prisma.vehicleType.create({ data });
      }
      successCount++;
    } catch (err) {
      console.error('Import error for vehicle:', v.name, err);
      errorCount++;
    }
  }

  res.json({ successCount, errorCount });
});

router.put('/vehicle-types/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    name, description, seats, brand, owner, 
    contractStart, contractEnd, manufacturingYear, 
    inspectionExpiry, isActive 
  } = req.body;
  
  try {
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (seats !== undefined) data.seats = Number(seats) || null;
    if (brand !== undefined) data.brand = brand;
    if (owner !== undefined) data.owner = owner;
    if (contractStart !== undefined) data.contractStart = contractStart ? new Date(contractStart) : null;
    if (contractEnd !== undefined) data.contractEnd = contractEnd ? new Date(contractEnd) : null;
    if (manufacturingYear) data.manufacturingYear = Number(manufacturingYear);
    if (inspectionExpiry !== undefined) data.inspectionExpiry = inspectionExpiry ? new Date(inspectionExpiry) : null;
    if (isActive !== undefined) data.isActive = isActive;
    
    const vehicleType = await prisma.vehicleType.update({ where: { id: Number(id) }, data });
    res.json(vehicleType);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/vehicle-types/:id', async (req, res) => {
  const { username } = req.query;
  const id = Number(req.params.id);
  try {
    if (username === 'quantri') {
      const testResults = await prisma.testResult.findMany({ where: { vehicleId: id } });
      const trIds = testResults.map(tr => tr.id);
      await prisma.score.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.examProgress.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.testResult.deleteMany({ where: { vehicleId: id } });
      await prisma.vehicleType.delete({ where: { id } });
      res.json({ success: true, message: `Đã xoá loại xe và ${testResults.length} kết quả thi liên quan.` });
    } else {
      await prisma.vehicleType.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá loại xe' });
    }
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});


// Test Types CRUD
router.get('/test-types', async (req, res) => {
  try {
    const testTypes = await prisma.testType.findMany({ orderBy: { id: 'desc' } });
    res.json(testTypes);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/test-types', async (req, res) => {
  const { name, description, maxScore, passingScore } = req.body;
  try {
    const data: any = { name, description };
    if (maxScore !== undefined) data.maxScore = Number(maxScore);
    if (passingScore !== undefined) data.passingScore = Number(passingScore);
    const testType = await prisma.testType.create({ data });
    res.json(testType);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Criteria CRUD
router.get('/criteria', async (req, res) => {
  try {
    const criteria = await prisma.criterion.findMany({ include: { exam: { include: { testType: true } } }, orderBy: { id: 'desc' } });
    res.json(criteria);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/criteria', async (req, res) => {
  const { name, pointsToDeduct, examId } = req.body;
  try {
    const criterion = await prisma.criterion.create({ data: { name, pointsToDeduct: Number(pointsToDeduct), examId: Number(examId) } });
    res.json(criterion);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/criteria/:id', async (req, res) => {
  const { id } = req.params;
  const { name, pointsToDeduct, examId } = req.body;
  try {
    const criterion = await prisma.criterion.update({
      where: { id: Number(id) },
      data: { name, pointsToDeduct: Number(pointsToDeduct), examId: Number(examId) }
    });
    res.json(criterion);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/criteria/:id', async (req, res) => {
  const { username } = req.query;
  const id = Number(req.params.id);
  try {
    if (username === 'quantri') {
      await prisma.score.deleteMany({ where: { criterionId: id } });
      await prisma.criterion.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá tiêu chí và các điểm bị trừ liên quan.' });
    } else {
      await prisma.criterion.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá tiêu chí' });
    }
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});


// Exams CRUD
router.get('/exams', async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({ include: { testType: true, criteria: true }, orderBy: { id: 'desc' } });
    res.json(exams);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/exams', async (req, res) => {
  const { name, description, testTypeId } = req.body;
  try {
    const exam = await prisma.exam.create({ data: { name, description, testTypeId: Number(testTypeId) } });
    res.json(exam);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/exams/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, testTypeId } = req.body;
  try {
    const exam = await prisma.exam.update({
      where: { id: Number(id) },
      data: { name, description, testTypeId: Number(testTypeId) }
    });
    res.json(exam);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/exams/:id', async (req, res) => {
  const { username } = req.query;
  const id = Number(req.params.id);
  try {
    if (username === 'quantri') {
      const criteria = await prisma.criterion.findMany({ where: { examId: id } });
      for (const c of criteria) {
         await prisma.score.deleteMany({ where: { criterionId: c.id } });
      }
      await prisma.criterion.deleteMany({ where: { examId: id } });
      await prisma.examProgress.deleteMany({ where: { examId: id } });
      await prisma.testAssignment.deleteMany({ where: { examId: id } });
      await prisma.exam.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá bài thi và các dữ liệu liên quan.' });
    } else {
      await prisma.criterion.deleteMany({ where: { examId: id } });
      await prisma.exam.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá bài thi' });
    }
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});


// Assignments Management
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await prisma.testAssignment.findMany({
      include: {
        examiner: { select: { id: true, name: true, role: true } },
        testType: { select: { id: true, name: true } },
        exam: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        vehicles: { 
          where: { isActive: true },
          select: { id: true, name: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assignments);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/assignments', async (req, res) => {
  const { examinerId, testTypeIds, testTypeId, examIds, courseId, assignmentDate, vehicleIds, showScore } = req.body;
  try {
    const tIds = testTypeIds && Array.isArray(testTypeIds) && testTypeIds.length > 0 ? testTypeIds : [testTypeId];
    let count = 0;
    
    if (examIds && Array.isArray(examIds) && examIds.length > 0) {
      for (const eId of examIds) {
        const exam = await prisma.exam.findUnique({ where: { id: Number(eId) } });
        if (!exam) continue;

        if (!tIds.includes(String(exam.testTypeId)) && !tIds.includes(Number(exam.testTypeId))) {
           continue; 
        }
        
        const recordWhere: any = {
          examinerId: Number(examinerId),
          testTypeId: exam.testTypeId,
          examId: exam.id
        };
        if (courseId) recordWhere.courseId = Number(courseId);
        if (assignmentDate) recordWhere.assignmentDate = new Date(assignmentDate);

        const existing = await prisma.testAssignment.findFirst({ where: recordWhere });
        if (existing) {
          return res.status(400).json({ error: `Bài thi "${exam.name}" đã được phân công cho người này với cùng khóa đào tạo và thời gian.` });
        }

        const baseData = { ...recordWhere, showScore: showScore !== undefined ? showScore : true };
        if (vehicleIds && Array.isArray(vehicleIds) && vehicleIds.length > 0) {
          baseData.vehicles = { connect: vehicleIds.map((vId: any) => ({ id: Number(vId) })) };
        }
        
        await prisma.testAssignment.create({ data: baseData });
        count++;
      }
    } else {
      for (const tId of tIds) {
        if (!tId) continue;
        
        const whereData: any = {
          examinerId: Number(examinerId),
          testTypeId: Number(tId),
        };
        if (courseId) whereData.courseId = Number(courseId);
        if (assignmentDate) whereData.assignmentDate = new Date(assignmentDate);

        const baseData = { ...whereData, showScore: showScore !== undefined ? showScore : true };
        if (vehicleIds && Array.isArray(vehicleIds) && vehicleIds.length > 0) {
          baseData.vehicles = { connect: vehicleIds.map((vId: any) => ({ id: Number(vId) })) };
        }

        const existing = await prisma.testAssignment.findFirst({ where: whereData });
        if (existing) {
          const tt = await prisma.testType.findUnique({ where: { id: Number(tId) }});
          return res.status(400).json({ error: `Người này đã được phân công ở trạm "${tt?.name}" với cùng khóa đào tạo và thời gian.` });
        }

        await prisma.testAssignment.create({ data: baseData });
        count++;
      }
    }
    res.json({ success: true, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { examinerId, testTypeId, examId, examIds, courseId, assignmentDate, vehicleIds, showScore } = req.body;
  try {
    const mainExamId = examIds && examIds.length > 0 ? Number(examIds[0]) : (examId ? Number(examId) : null);
    
    const data: any = {
      examinerId: Number(examinerId),
      testTypeId: Number(testTypeId),
      examId: mainExamId,
      courseId: courseId ? Number(courseId) : null,
      assignmentDate: assignmentDate ? new Date(assignmentDate) : null,
    };
    
    if (showScore !== undefined) {
      data.showScore = showScore;
    }

    if (vehicleIds && Array.isArray(vehicleIds)) {
      data.vehicles = { set: vehicleIds.map((vId: any) => ({ id: Number(vId) })) };
    } else {
      data.vehicles = { set: [] };
    }

    const assignment = await prisma.testAssignment.update({
      where: { id: Number(id) },
      data
    });

    if (examIds && Array.isArray(examIds) && examIds.length > 1) {
      const remainingExamIds = examIds.slice(1);
      for (const eId of remainingExamIds) {
        const recordWhere: any = {
          examinerId: Number(examinerId),
          testTypeId: Number(testTypeId),
          examId: Number(eId)
        };
        if (courseId) recordWhere.courseId = Number(courseId);
        if (assignmentDate) recordWhere.assignmentDate = new Date(assignmentDate);

        const existing = await prisma.testAssignment.findFirst({ where: recordWhere });
        if (!existing) {
          const baseData = { ...recordWhere, showScore: showScore !== undefined ? showScore : true };
          if (vehicleIds && Array.isArray(vehicleIds) && vehicleIds.length > 0) {
            baseData.vehicles = { connect: vehicleIds.map((vId: any) => ({ id: Number(vId) })) };
          }
          await prisma.testAssignment.create({ data: baseData });
        }
      }
    }

    res.json(assignment);
  } catch (error) { 
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

router.delete('/assignments/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.testAssignment.delete({ where: { id } });
    res.json({ success: true, message: 'Đã xoá phân công' });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
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
  const { username } = req.query;
  const id = Number(req.params.id);
  try {
    if (username === 'quantri') {
      await prisma.testAssignment.deleteMany({ where: { examinerId: id } });
      await prisma.examProgress.deleteMany({ where: { examinerId: id } });
      await prisma.testResult.updateMany({ where: { stationManagerId: id }, data: { stationManagerId: null } });
      await prisma.systemLog.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá người dùng và các dữ liệu liên quan.' });
    } else {
      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá người dùng' });
    }
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});


router.put('/test-types/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, maxScore, passingScore } = req.body;
  try {
    const data: any = { name, description };
    if (maxScore !== undefined) data.maxScore = Number(maxScore);
    if (passingScore !== undefined) data.passingScore = Number(passingScore);
    const testType = await prisma.testType.update({
      where: { id: Number(id) },
      data
    });
    res.json(testType);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/test-types/:id', async (req, res) => {
  const { username } = req.query;
  const id = Number(req.params.id);
  try {
    if (username === 'quantri') {
      const testResults = await prisma.testResult.findMany({ where: { testTypeId: id } });
      const trIds = testResults.map(tr => tr.id);
      await prisma.score.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.examProgress.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.testResult.deleteMany({ where: { testTypeId: id } });
      
      const exams = await prisma.exam.findMany({ where: { testTypeId: id } });
      for (const exam of exams) {
        await prisma.criterion.deleteMany({ where: { examId: exam.id } });
        await prisma.examProgress.deleteMany({ where: { examId: exam.id } });
      }
      await prisma.exam.deleteMany({ where: { testTypeId: id } });
      await prisma.testAssignment.deleteMany({ where: { testTypeId: id } });
      await prisma.testType.delete({ where: { id } });
      res.json({ success: true, message: `Đã xoá loại bài thi, ${exams.length} bài thi con và ${testResults.length} kết quả thi liên quan.` });
    } else {
      const exams = await prisma.exam.findMany({ where: { testTypeId: id } });
      for (const exam of exams) {
        await prisma.criterion.deleteMany({ where: { examId: exam.id } });
      }
      await prisma.exam.deleteMany({ where: { testTypeId: id } });
      await prisma.testType.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá loại bài thi' });
    }
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});


// Settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
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

// Students CRUD
router.get('/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: { id: 'desc' },
      include: { course: true, teacher: { select: { id: true, name: true, username: true } } }
    });
    res.json(students);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/students', async (req, res) => {
  const { 
    registrationCode, name, dob, cccd, address, licenseNumber, 
    licenseClass, licenseIssueDate, passDate, licenseExpiryDate, 
    licenseDuration, courseName, courseId, teacherId 
  } = req.body;
  try {
    const student = await prisma.student.create({ 
      data: {
        registrationCode, name, dob, cccd, address, licenseNumber, 
        licenseClass, licenseIssueDate, passDate, licenseExpiryDate, 
        licenseDuration, courseName, courseId: courseId ? Number(courseId) : null,
        teacherId: teacherId ? Number(teacherId) : null
      } 
    });
    res.json(student);
  } catch (error: any) { 
    if (error.code === 'P2002') return res.status(400).json({ error: 'CCCD đã tồn tại' });
    res.status(500).json({ error: 'Server error' }); 
  }
});

router.put('/students/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    registrationCode, name, dob, cccd, address, licenseNumber, 
    licenseClass, licenseIssueDate, passDate, licenseExpiryDate, 
    licenseDuration, courseName, courseId, teacherId 
  } = req.body;
  try {
    const data: any = {
      registrationCode, name, dob, cccd, address, licenseNumber, 
      licenseClass, licenseIssueDate, passDate, licenseExpiryDate, 
      licenseDuration, courseName
    };
    if (courseId !== undefined) data.courseId = courseId ? Number(courseId) : null;
    if (teacherId !== undefined) data.teacherId = teacherId ? Number(teacherId) : null;
    const student = await prisma.student.update({ where: { id: Number(id) }, data });
    res.json(student);
  } catch (error: any) { 
    if (error.code === 'P2002') return res.status(400).json({ error: 'CCCD đã tồn tại' });
    res.status(500).json({ error: 'Server error' }); 
  }
});

router.delete('/students/:id', async (req, res) => {
  const { username } = req.query;
  const id = Number(req.params.id);
  try {
    if (username === 'quantri') {
      const testResults = await prisma.testResult.findMany({ where: { studentId: id } });
      const trIds = testResults.map(tr => tr.id);
      await prisma.score.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.examProgress.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.testResult.deleteMany({ where: { studentId: id } });
      await prisma.student.delete({ where: { id } });
      res.json({ success: true, message: `Đã xoá học viên và ${testResults.length} kết quả thi liên quan.` });
    } else {
      await prisma.student.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xoá học viên' });
    }
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/students/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  const { username } = req.query;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided' });
  
  try {
    const studentIds = ids.map((id: any) => Number(id));
    if (username === 'quantri') {
      const testResults = await prisma.testResult.findMany({ where: { studentId: { in: studentIds } } });
      const trIds = testResults.map(tr => tr.id);
      await prisma.score.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.examProgress.deleteMany({ where: { testResultId: { in: trIds } } });
      await prisma.testResult.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
      res.json({ success: true, count: ids.length, message: `Đã xoá ${ids.length} học viên và ${testResults.length} kết quả thi liên quan.` });
    } else {
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
      res.json({ success: true, count: ids.length, message: `Đã xoá ${ids.length} học viên.` });
    }
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/students/bulk', async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students)) return res.status(400).json({ error: 'Invalid data format' });
  
  try {
    let imported = 0;
    let skipped = 0;
    for (const s of students) {
      if (!s.cccd || !s.name) continue;
      const existing = await prisma.student.findUnique({ where: { cccd: String(s.cccd) } });
      const courseId = s.courseId ? Number(s.courseId) : null;
      let teacherId = null;
      if (s.teacherUsername) {
        const t = await prisma.user.findUnique({ where: { username: s.teacherUsername } });
        if (t) teacherId = t.id;
      }
      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            registrationCode: s.registrationCode,
            name: s.name,
            dob: s.dob,
            address: s.address,
            licenseNumber: s.licenseNumber,
            licenseClass: s.licenseClass,
            licenseIssueDate: s.licenseIssueDate,
            passDate: s.passDate,
            licenseExpiryDate: s.licenseExpiryDate,
            licenseDuration: s.licenseDuration,
            courseName: s.courseName,
            courseId: courseId !== null ? courseId : existing.courseId,
            teacherId: teacherId !== null ? teacherId : existing.teacherId,
          }
        });
        skipped++;
      } else {
        await prisma.student.create({
          data: {
            registrationCode: s.registrationCode,
            name: s.name,
            dob: s.dob,
            cccd: String(s.cccd),
            address: s.address,
            licenseNumber: s.licenseNumber,
            licenseClass: s.licenseClass,
            licenseIssueDate: s.licenseIssueDate,
            passDate: s.passDate,
            licenseExpiryDate: s.licenseExpiryDate,
            licenseDuration: s.licenseDuration,
            courseName: s.courseName,
            courseId,
            teacherId,
          }
        });
        imported++;
      }
    }
    res.json({ imported, updated: skipped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi nhập dữ liệu' });
  }
});

// Station Testing
router.get('/station/students', async (req, res) => {
  const { examinerId } = req.query;
  if (!examinerId) return res.status(400).json({ error: 'Missing examinerId' });
  try {
    const vnTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vnTime = new Date(vnTimeString);
    const vnYear = vnTime.getFullYear();
    const vnMonth = String(vnTime.getMonth() + 1).padStart(2, '0');
    const vnDate = String(vnTime.getDate()).padStart(2, '0');
    const todayUtcMidnight = new Date(`${vnYear}-${vnMonth}-${vnDate}T00:00:00+07:00`);

    const assignments = await prisma.testAssignment.findMany({
      where: { 
        examinerId: Number(examinerId),
        OR: [
          { assignmentDate: null },
          { assignmentDate: { gte: todayUtcMidnight } }
        ]
      },
      include: { testType: true, course: true, vehicles: true }
    });
    
    const courseIds = [...new Set(assignments.map(a => a.courseId).filter(Boolean))] as number[];
    if (courseIds.length === 0) {
      return res.json({ students: [], assignments });
    }

    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } }
    });
    const courseNames = courses.map(c => c.name);

    const students = await prisma.student.findMany({
      where: { 
        OR: [
          { courseId: { in: courseIds } },
          { courseName: { in: courseNames } }
        ]
      },
      include: { 
        course: true, 
        testResults: {
          include: { stationManager: true, vehicle: true }
        }
      }
    });

    const assignedTestTypeIds = assignments.map(a => a.testTypeId);
    const availableStudents = students.filter(s => {
      const busyAtOtherStation = s.testResults.some(tr => 
        tr.status === 'IN_PROGRESS' && !assignedTestTypeIds.includes(tr.testTypeId)
      );
      return !busyAtOtherStation;
    });

    res.json({ students: availableStudents, assignments });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/station/students-v2', async (req, res) => {
  const { userId, role, date, courseId } = req.query;
  if (!userId || !role) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    let targetDateMidnight: Date | null = null;
    let nextDateMidnight: Date | null = null;

    if (date && typeof date === 'string' && date !== 'ALL') {
      targetDateMidnight = new Date(`${date}T00:00:00+07:00`);
      nextDateMidnight = new Date(`${date}T00:00:00+07:00`);
      nextDateMidnight.setDate(nextDateMidnight.getDate() + 1);
    } else if (date !== 'ALL') {
      const vnTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
      const vnTime = new Date(vnTimeString);
      const vnYear = vnTime.getFullYear();
      const vnMonth = String(vnTime.getMonth() + 1).padStart(2, '0');
      const vnDate = String(vnTime.getDate()).padStart(2, '0');
      targetDateMidnight = new Date(`${vnYear}-${vnMonth}-${vnDate}T00:00:00+07:00`);
      nextDateMidnight = new Date(`${vnYear}-${vnMonth}-${vnDate}T00:00:00+07:00`);
      nextDateMidnight.setDate(nextDateMidnight.getDate() + 1);
    }

    let studentWhere: any = {};
    let assignments: any[] = [];

    if (role === 'ADMIN' || role === 'MANAGER') {
      // Admin/Manager needs assignments to know which test types are active
      let assignmentWhere: any = { examiner: { role: 'STATION_MANAGER' } };
      
      if (targetDateMidnight && nextDateMidnight) {
        assignmentWhere.OR = [
          { assignmentDate: null },
          { 
            assignmentDate: { 
              gte: targetDateMidnight,
              lt: nextDateMidnight
            } 
          }
        ];
      }
      
      if (courseId && courseId !== 'ALL') {
        assignmentWhere.courseId = Number(courseId);
      }

      assignments = await prisma.testAssignment.findMany({
        where: assignmentWhere,
        include: { testType: true, course: true, vehicles: true }
      });
      const courseIds = [...new Set(assignments.map(a => a.courseId).filter(Boolean))] as number[];
      if (courseIds.length > 0) {
        const courses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
        const courseNames = courses.map(c => c.name);
        studentWhere = { 
          OR: [
            { courseId: { in: courseIds } },
            { courseName: { in: courseNames } },
            { RetakeSession: { some: { targetCourseId: { in: courseIds } } } }
          ]
        };
      } else {
        studentWhere = { id: -1 }; // no students
      }
    } else if (role === 'STATION_MANAGER') {
      let assignmentWhere: any = { examinerId: Number(userId) };
      if (targetDateMidnight && nextDateMidnight) {
        assignmentWhere.OR = [
          { assignmentDate: null },
          { 
            assignmentDate: { 
              gte: targetDateMidnight,
              lt: nextDateMidnight
            } 
          }
        ];
      }
      if (courseId && courseId !== 'ALL') {
        assignmentWhere.courseId = Number(courseId);
      }
      
      assignments = await prisma.testAssignment.findMany({
        where: assignmentWhere,
        include: { testType: true, course: true, vehicles: true }
      });
      const courseIds = [...new Set(assignments.map(a => a.courseId).filter(Boolean))] as number[];
      if (courseIds.length > 0) {
        const courses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
        const courseNames = courses.map(c => c.name);
        studentWhere = {
          OR: [
            { courseId: { in: courseIds } },
            { courseName: { in: courseNames } },
            { RetakeSession: { some: { targetCourseId: { in: courseIds } } } }
          ]
        };
      } else {
        // If station manager has no assignments, return empty
        return res.json({ students: [], assignments: [] });
      }
    } else if (role === 'EXAMINER') {
      // Examiner sees students they have graded
      const examProgresses = await prisma.examProgress.findMany({
        where: { examinerId: Number(userId) },
        include: { testResult: true }
      });
      const studentIds = [...new Set(examProgresses.map(ep => ep.testResult.studentId))];
      studentWhere = { id: { in: studentIds } };
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: { 
        course: true,
        teacher: { select: { id: true, name: true, username: true } },
        RetakeSession: true,
        testResults: {
          include: { 
            stationManager: true, 
            vehicle: true, 
            testType: true,
            scores: {
              include: {
                criterion: {
                  include: { exam: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { id: 'desc' },
      take: 500 // Limit to avoid massive payloads for admin
    });

    if (role === 'STATION_MANAGER') {
      const myTestTypeIds = assignments.map(a => a.testTypeId);
      students = students.filter(s => {
        return s.testResults.some(tr => 
          myTestTypeIds.includes(tr.testTypeId) && 
          tr.status !== 'ABSENT' && 
          tr.status !== 'PENDING'
        );
      });
    }

    res.json({ students, assignments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/station/confirm-test', async (req, res) => {
  const { studentId, testTypeId, stationManagerId } = req.body;
  try {
    let testResult = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) },
      orderBy: { createdAt: 'desc' }
    });

    if (testResult) {
      testResult = await prisma.testResult.update({
        where: { id: testResult.id },
        data: { 
          status: 'CONFIRMED',
          stationManagerId: Number(stationManagerId),
          updatedAt: new Date()
        }
      });
    } else {
      const testType = await prisma.testType.findUnique({ where: { id: Number(testTypeId) } });
      testResult = await prisma.testResult.create({
        data: {
          studentId: Number(studentId),
          testTypeId: Number(testTypeId),
          status: 'CONFIRMED',
          stationManagerId: Number(stationManagerId),
          totalScore: testType?.maxScore || 100,
        }
      });
    }

    res.json(testResult);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/station/start-test', async (req, res) => {
  const { studentId, testTypeId, vehicleId, stationManagerId } = req.body;
  try {
    let testResult = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) },
      orderBy: { createdAt: 'desc' }
    });
    
    const testType = await prisma.testType.findUnique({ where: { id: Number(testTypeId) } });
    if (!testType) return res.status(404).json({ error: 'Không tìm thấy trạm thi' });

    // Check vehicle occupancy
    if (vehicleId) {
      const inProgressCount = await prisma.testResult.count({
        where: {
          vehicleId: Number(vehicleId),
          status: 'IN_PROGRESS'
        }
      });
      const isDuongTruong = testType.name.toLowerCase().includes('đường trường');
      const maxOccupancy = isDuongTruong ? 4 : 1;
      
      if (inProgressCount >= maxOccupancy) {
        return res.status(400).json({ error: `Xe này đã đủ số lượng học viên đang thi (tối đa ${maxOccupancy} người). Vui lòng chọn xe khác.` });
      }
    }

    const maxScore = testType.maxScore || 100;

    if (testResult) {
      testResult = await prisma.testResult.update({
        where: { id: testResult.id },
        data: { 
          status: 'IN_PROGRESS', 
          vehicleId: Number(vehicleId),
          stationManagerId: stationManagerId ? Number(stationManagerId) : null,
          startTime: new Date(),
          totalScore: testResult.status === 'PENDING' ? maxScore : testResult.totalScore
        }
      });
    } else {
      testResult = await prisma.testResult.create({
        data: { 
          studentId: Number(studentId), 
          testTypeId: Number(testTypeId), 
          vehicleId: Number(vehicleId),
          status: 'IN_PROGRESS',
          totalScore: maxScore,
          stationManagerId: stationManagerId ? Number(stationManagerId) : null,
          startTime: new Date()
        }
      });
    }
    res.json(testResult);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/station/end-test', async (req, res) => {
  const { studentId, testTypeId } = req.body;
  try {
    const testResult = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) },
      orderBy: { createdAt: 'desc' }
    });
    
    if (testResult) {
      await prisma.testResult.update({
        where: { id: testResult.id },
        data: { 
          status: 'TRANSFERRED',
          endTime: new Date()
        }
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/station/mark-absent', async (req, res) => {
  const { studentId, testTypeId, stationManagerId } = req.body;
  try {
    let testResult = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) },
      orderBy: { createdAt: 'desc' }
    });
    
    if (testResult) {
      testResult = await prisma.testResult.update({
        where: { id: testResult.id },
        data: { 
          status: 'ABSENT',
          totalScore: 0,
          stationManagerId: stationManagerId ? Number(stationManagerId) : null,
          endTime: new Date()
        }
      });
    } else {
      testResult = await prisma.testResult.create({
        data: { 
          studentId: Number(studentId), 
          testTypeId: Number(testTypeId), 
          status: 'ABSENT',
          totalScore: 0,
          stationManagerId: stationManagerId ? Number(stationManagerId) : null,
          endTime: new Date()
        }
      });
    }
    res.json(testResult);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/station/transfer-score', async (req, res) => {
  const { studentId, testTypeId } = req.body;
  try {
    const testResult = await prisma.testResult.findUnique({
      where: { studentId_testTypeId: { studentId: Number(studentId), testTypeId: Number(testTypeId) } }
    });
    
    if (testResult) {
      await prisma.testResult.update({
        where: { id: testResult.id },
        data: { status: 'TRANSFERRED' }
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all results for Results page
router.get('/results', async (req, res) => {
  try {
    const testResults = await prisma.testResult.findMany({
      include: {
        student: {
          include: {
            course: true
          }
        },
        testType: true,
        progress: {
          include: {
            exam: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    res.json(testResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy kết quả' });
  }
});
// GET system logs
router.get('/system-logs', async (req, res) => {
  const { userId, role } = req.query;
  if (!userId || !role) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const vnTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vnTime = new Date(vnTimeString);
    const vnYear = vnTime.getFullYear();
    const vnMonth = String(vnTime.getMonth() + 1).padStart(2, '0');
    const vnDate = String(vnTime.getDate()).padStart(2, '0');
    const todayUtcMidnight = new Date(`${vnYear}-${vnMonth}-${vnDate}T00:00:00+07:00`);

    // Clean up stale sessions (no ping for > 5 minutes)
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const staleUsers = await prisma.user.findMany({
      where: {
        isOnline: true,
        OR: [
          { lastPingAt: { lt: staleThreshold } },
          { lastPingAt: null }
        ]
      }
    });

    if (staleUsers.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: staleUsers.map(u => u.id) } },
        data: { isOnline: false }
      });
      const logsToInsert = staleUsers.map(u => ({
        userId: u.id,
        action: 'LOGOUT'
      }));
      await prisma.systemLog.createMany({ data: logsToInsert });
    }

    let userIdsToFetch: number[] = [];

    if (role === 'ADMIN' || role === 'MANAGER') {
      const users = await prisma.user.findMany({
        where: role === 'MANAGER' ? { role: { in: ['MANAGER', 'STATION_MANAGER', 'EXAMINER'] } } : {}
      });
      userIdsToFetch = users.map(u => u.id);
    } else if (role === 'STATION_MANAGER') {
      // Find assignments for this station manager today or null date
      const nextDateMidnight = new Date(todayUtcMidnight);
      nextDateMidnight.setDate(nextDateMidnight.getDate() + 1);
      
      const smAssignments = await prisma.testAssignment.findMany({
        where: {
          examinerId: Number(userId),
          OR: [
            { assignmentDate: null },
            { 
              assignmentDate: { 
                gte: todayUtcMidnight,
                lt: nextDateMidnight
              } 
            }
          ]
        }
      });
      
      const assignedTestTypeIds = [...new Set(smAssignments.map(a => a.testTypeId))];
      
      // Find all EXAMINERs assigned to these testTypeIds
      if (assignedTestTypeIds.length > 0) {
        const examinerAssignments = await prisma.testAssignment.findMany({
          where: {
            testTypeId: { in: assignedTestTypeIds },
            OR: [
              { assignmentDate: null },
              { 
                assignmentDate: { 
                  gte: todayUtcMidnight,
                  lt: nextDateMidnight
                } 
              }
            ]
          },
          include: { examiner: true }
        });
        
        const examiners = examinerAssignments.map(a => a.examiner).filter(u => u && u.role === 'EXAMINER');
        userIdsToFetch = [...new Set([...examiners.map(e => e.id), Number(userId)])];
      }
    }

    if (userIdsToFetch.length === 0) {
      return res.json([]);
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIdsToFetch } },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isOnline: true,
      }
    });

    const userLogs = await Promise.all(users.map(async u => {
      const lastLogin = await prisma.systemLog.findFirst({
        where: { userId: u.id, action: 'LOGIN' },
        orderBy: { createdAt: 'desc' }
      });
      const lastLogout = await prisma.systemLog.findFirst({
        where: { userId: u.id, action: 'LOGOUT' },
        orderBy: { createdAt: 'desc' }
      });
      return {
        user: u,
        lastLoginAt: lastLogin?.createdAt || null,
        lastLogoutAt: lastLogout?.createdAt || null
      };
    }));

    // Sort users by last login or logout time, newest first
    userLogs.sort((a, b) => {
      const timeA = Math.max(a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0, a.lastLogoutAt ? new Date(a.lastLogoutAt).getTime() : 0);
      const timeB = Math.max(b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0, b.lastLogoutAt ? new Date(b.lastLogoutAt).getTime() : 0);
      return timeB - timeA;
    });

    res.json(userLogs.filter(ul => ul.user.username !== 'quantri'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/scores/import', async (req, res) => {
  const { scores, stationManagerId } = req.body;
  if (!Array.isArray(scores)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });

  const logs: { status: 'success'|'error', message: string, row: any }[] = [];

  for (const row of scores) {
    try {
      const { cccd, courseName, testTypeName, remainingScore, errorsText, status } = row;
      
      if (!cccd || !courseName || !testTypeName) {
        logs.push({ status: 'error', message: 'Thiếu CCCD, Khóa đào tạo hoặc Trạm thi', row });
        continue;
      }

      // Check student & course
      const student = await prisma.student.findFirst({
        where: { cccd }
      });
      if (!student) {
        logs.push({ status: 'error', message: `CCCD ${cccd} không tồn tại`, row });
        continue;
      }
      
      const course = await prisma.course.findFirst({
        where: { name: courseName }
      });
      if (!course) {
        logs.push({ status: 'error', message: `Khóa đào tạo ${courseName} không tồn tại`, row });
        continue;
      }
      
      // Update student course if needed
      if (student.courseId !== course.id && student.courseName !== courseName) {
         await prisma.student.update({
           where: { id: student.id },
           data: { courseId: course.id, courseName: course.name }
         });
      }

      // Check test type
      const testType = await prisma.testType.findFirst({
        where: { name: testTypeName }
      });
      if (!testType) {
        logs.push({ status: 'error', message: `Trạm thi ${testTypeName} không tồn tại`, row });
        continue;
      }

      // Check if test result already exists
      const existingResult = await prisma.testResult.findFirst({
        where: {
          studentId: student.id, testTypeId: testType.id
        },
        orderBy: { createdAt: 'desc' }
      });
      if (existingResult) {
        logs.push({ status: 'error', message: 'Học viên đã có điểm ở Trạm thi này', row });
        continue;
      }

      // Parse errorsText
      // Example: "Không xi nhan (x2), Chết máy (x1)"
      let totalDeduction = 0;
      const scoreData: any[] = [];
      
      if (errorsText && errorsText.trim() !== '') {
        const exam = await prisma.exam.findFirst({
          where: { testTypeId: testType.id },
          include: { criteria: true }
        });
        
        if (exam && exam.criteria.length > 0) {
          const errorParts = errorsText.split(',').map((p: string) => p.trim()).filter(Boolean);
          for (const part of errorParts) {
            // match "Error Name (x2)" or "Error Name"
            const match = part.match(/^(.*?)(?:\s*\(x(\d+)\))?$/);
            if (match) {
              const errName = match[1].trim();
              const times = match[2] ? parseInt(match[2], 10) : 1;
              
              // Find criterion by name (case-insensitive approximation)
              const criterion = exam.criteria.find(c => c.name.toLowerCase() === errName.toLowerCase());
              if (criterion) {
                totalDeduction += criterion.pointsToDeduct * times;
                scoreData.push({ criterionId: criterion.id, timesDeducted: times });
              } else {
                // If we want to strictly require matching:
                throw new Error(`Lỗi "${errName}" không có trong danh mục lỗi của trạm này`);
              }
            }
          }
        } else {
          if (errorsText.trim() !== '') {
             throw new Error('Trạm thi này chưa được cấu hình danh sách lỗi');
          }
        }
      }

      let finalScore = remainingScore;
      if (finalScore === null || finalScore === undefined) {
        finalScore = testType.maxScore - totalDeduction;
      }
      
      let finalStatus = status;
      if (!finalStatus) {
        finalStatus = finalScore >= testType.passingScore ? 'ĐẬU' : 'RỚT';
      }
      if (['ĐẬU', 'RỚT', 'VẮNG', 'CHƯA HOÀN THÀNH'].indexOf(finalStatus) === -1) {
         finalStatus = finalScore >= testType.passingScore ? 'ĐẬU' : 'RỚT';
      }

      // Create TestResult and Scores
      await prisma.$transaction(async (tx) => {
        const tr = await tx.testResult.create({
          data: {
            studentId: student.id,
            testTypeId: testType.id,
            totalScore: finalScore,
            status: finalStatus,
            stationManagerId: stationManagerId || null,
            startTime: new Date(),
            endTime: new Date()
          }
        });
        
        if (scoreData.length > 0) {
          for (const sd of scoreData) {
            await tx.score.create({
              data: {
                testResultId: tr.id,
                criterionId: sd.criterionId,
                timesDeducted: sd.timesDeducted
              }
            });
          }
        }
      });

      logs.push({ status: 'success', message: `Import thành công (${finalScore}đ - ${finalStatus})`, row });

    } catch (e: any) {
      logs.push({ status: 'error', message: e.message || 'Lỗi không xác định', row });
    }
  }

  res.json({ logs });
});


// Sửa điểm thi (chỉ dành cho quantri)
router.put('/test-results/:id/score', async (req, res) => {
  const { username } = req.query;
  const { totalScore, status } = req.body;
  const id = Number(req.params.id);
  if (username !== 'quantri') {
    return res.status(403).json({ error: 'Không có quyền thực hiện chức năng này.' });
  }
  try {
    const updated = await prisma.testResult.update({
      where: { id },
      data: {
        totalScore: Number(totalScore),
        status: status
      }
    });
    res.json({ success: true, message: 'Đã cập nhật điểm thi thành công.', testResult: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


// --- RETAKE SESSION ENDPOINTS ---

router.get('/retakes', async (req, res) => {
  try {
    const sessions = await prisma.retakeSession.findMany({
      include: {
        student: true,
        targetCourse: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching retake sessions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/retakes', async (req, res) => {
  const { studentIds, targetCourseId } = req.body;
  try {
    if (!studentIds || !targetCourseId || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    
    let createdCount = 0;
    for (const studentId of studentIds) {
      // Create if not exists
      const existing = await prisma.retakeSession.findUnique({
        where: {
          studentId_targetCourseId: {
            studentId: Number(studentId),
            targetCourseId: Number(targetCourseId)
          }
        }
      });
      if (!existing) {
        await prisma.retakeSession.create({
          data: {
            studentId: Number(studentId),
            targetCourseId: Number(targetCourseId)
          }
        });
        createdCount++;
      }
    }
    
    res.json({ success: true, message: `Đã thêm ${createdCount} học viên vào danh sách thi lại` });
  } catch (error) {
    console.error('Error creating retake session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/retakes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.retakeSession.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting retake session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/retake-eligibility', async (req, res) => {
  try {
    // Find students who have failed or absent (but no need to overcomplicate for now, we just list all students and let frontend filter, or we can filter here)
    const students = await prisma.student.findMany({
      include: {
        course: true,
        testResults: {
          include: { testType: true }
        }
      },
      orderBy: { id: 'desc' },
      take: 1000
    });
    
    // We filter students who have at least one test result with FAILED or ABSENT, OR students without full completion.
    // Actually, letting frontend filter is better for a comprehensive UI.
    res.json(students);
  } catch (error) {
    console.error('Error fetching students for retake:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const getSetting = async (key: string) => {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value;
};

router.get('/cron/check-vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicleType.findMany({
      where: { isActive: true }
    });

    const now = new Date();
    const emailsToSend: any[] = [];
    const suspendedVehicles: any[] = [];
    const vehicleIdsToSuspend: number[] = [];

    for (const v of vehicles) {
      let isSuspended = false;
      let suspendReason = '';
      let suspendDate: any = null;

      if (v.inspectionExpiry) {
        const inspDiff = Math.ceil((new Date(v.inspectionExpiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (inspDiff === 30) emailsToSend.push({ ...v, reason: 'Hạn kiểm định', date: v.inspectionExpiry });
        else if (inspDiff <= 0) {
          isSuspended = true;
          suspendReason = 'Hết hạn GĐK';
          suspendDate = v.inspectionExpiry;
        }
      }
      
      if (v.contractEnd) {
        const contDiff = Math.ceil((new Date(v.contractEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (contDiff === 30) emailsToSend.push({ ...v, reason: 'Hạn hợp đồng', date: v.contractEnd });
        else if (contDiff <= 0 && !isSuspended) {
          isSuspended = true;
          suspendReason = 'Hết hạn hợp đồng';
          suspendDate = v.contractEnd;
        }
      }

      if (isSuspended) {
        suspendedVehicles.push({ ...v, reason: suspendReason, date: suspendDate });
        vehicleIdsToSuspend.push(v.id);
      }
    }

    if (vehicleIdsToSuspend.length > 0) {
      await prisma.vehicleType.updateMany({
        where: { id: { in: vehicleIdsToSuspend } },
        data: { isActive: false }
      });
    }

    if (emailsToSend.length === 0 && suspendedVehicles.length === 0) {
      return res.json({ success: true, message: 'Không có xe nào cần thông báo hoặc tạm ngưng' });
    }

    const adminsAndManagers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MANAGER'] },
        isActive: true,
        email: { not: null }
      }
    });

    if (adminsAndManagers.length === 0) {
      return res.json({ success: true, message: 'Không có người nhận email' });
    }

    const host = await getSetting('smtp_host') || 'smtp.gmail.com';
    const port = parseInt(await getSetting('smtp_port') || '465');
    const secure = port === 465;
    const userEmail = await getSetting('smtp_user');
    const pass = await getSetting('smtp_app_password');
    const senderName = await getSetting('smtp_sender_name') || 'Hệ Thống Sát Hạch';

    if (!userEmail || !pass) {
      return res.status(500).json({ error: 'Chưa cấu hình SMTP' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: userEmail, pass }
    });

    let htmlContent = '';
    
    if (emailsToSend.length > 0) {
      htmlContent += `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto 20px auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background-color: #1a73e8; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Hệ Thống Quản Lý Sát Hạch</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Thông báo tự động</p>
          </div>
          
          <div style="padding: 20px;">
            <h3 style="color: #f57c00; margin-top: 0;">⚠️ Cảnh báo: Các xe sắp hết hạn (còn 30 ngày)</h3>
            <p style="color: #555; line-height: 1.5;">Chào bạn,</p>
            <p style="color: #555; line-height: 1.5;">Hệ thống phát hiện có một số xe sắp hết hạn <strong>Kiểm định (GĐK)</strong> hoặc <strong>Hợp đồng</strong> trong vòng 30 ngày tới. Vui lòng kiểm tra và xử lý kịp thời:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Tên / Biển số</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Loại hạn</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Ngày hết hạn</th>
                </tr>
              </thead>
              <tbody>
                ${emailsToSend.map(v => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #444; font-weight: bold;">${v.name}</td>
                    <td style="padding: 12px; color: #f57c00;">${v.reason}</td>
                    <td style="padding: 12px; color: #444;">${new Date(v.date).toLocaleDateString('vi-VN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (suspendedVehicles.length > 0) {
      htmlContent += `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background-color: #d32f2f; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Hệ Thống Quản Lý Sát Hạch</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Thông báo Tạm ngưng phương tiện</p>
          </div>
          
          <div style="padding: 20px;">
            <h3 style="color: #d32f2f; margin-top: 0;">⛔ Cảnh báo khẩn: Các xe ĐÃ BỊ TẠM NGƯNG</h3>
            <p style="color: #555; line-height: 1.5;">Chào bạn,</p>
            <p style="color: #555; line-height: 1.5;">Hệ thống vừa <strong>tự động chuyển trạng thái Tạm ngưng</strong> đối với các xe dưới đây do đã quá hạn GĐK hoặc Hợp đồng. Các xe này sẽ không được phép tham gia phân công sát hạch:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Tên / Biển số</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Lý do tạm ngưng</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #333;">Ngày hết hạn</th>
                </tr>
              </thead>
              <tbody>
                ${suspendedVehicles.map(v => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #444; font-weight: bold;">${v.name}</td>
                    <td style="padding: 12px; color: #d32f2f; font-weight: bold;">${v.reason}</td>
                    <td style="padding: 12px; color: #444;">${new Date(v.date).toLocaleDateString('vi-VN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    htmlContent += `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto 0 auto; text-align: center;">
        <a href="https://sathach.vercel.app/manager/categories" style="display: inline-block; background-color: #1a73e8; color: white; padding: 10px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Truy cập Hệ thống</a>
      </div>
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto 0 auto; background-color: #f9f9f9; padding: 15px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee;">
        <p style="margin: 0;">Email này được gửi tự động từ Hệ Thống Quản Lý Sát Hạch.</p>
        <p style="margin: 5px 0 0 0;">Vui lòng không trả lời email này.</p>
      </div>
    `;

    const normalEmails = adminsAndManagers.filter(u => u.username !== 'quantri').map(u => u.email).join(',');
    const quantriEmails = adminsAndManagers.filter(u => u.username === 'quantri').map(u => u.email).join(',');

    const mailOptions: any = {
      from: `"${senderName}" <${userEmail}>`,
      subject: suspendedVehicles.length > 0 ? '⛔ Cảnh báo khẩn: Xe bị tạm ngưng do hết hạn' : 'Cảnh báo hạn kiểm định / hợp đồng xe',
      html: htmlContent
    };
    
    if (normalEmails) mailOptions.to = normalEmails;
    if (quantriEmails) mailOptions.bcc = quantriEmails;

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: `Đã gửi email cảnh báo tới ${adminsAndManagers.length} người dùng.` });
  } catch (error) {
    console.error('Error in cron check-vehicles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/examiner-records', async (req, res) => {
  const { date, courseId } = req.query;
  
  try {
    let targetDateMidnight: Date | null = null;
    let nextDateMidnight: Date | null = null;

    if (date && typeof date === 'string' && date !== 'ALL') {
      targetDateMidnight = new Date(`${date}T00:00:00+07:00`);
      nextDateMidnight = new Date(`${date}T00:00:00+07:00`);
      nextDateMidnight.setDate(nextDateMidnight.getDate() + 1);
    } else if (date !== 'ALL') {
      const vnTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
      const vnTime = new Date(vnTimeString);
      const vnYear = vnTime.getFullYear();
      const vnMonth = String(vnTime.getMonth() + 1).padStart(2, '0');
      const vnDate = String(vnTime.getDate()).padStart(2, '0');
      targetDateMidnight = new Date(`${vnYear}-${vnMonth}-${vnDate}T00:00:00+07:00`);
      nextDateMidnight = new Date(`${vnYear}-${vnMonth}-${vnDate}T00:00:00+07:00`);
      nextDateMidnight.setDate(nextDateMidnight.getDate() + 1);
    }

    let progressWhere: any = {};
    if (targetDateMidnight && nextDateMidnight) {
      progressWhere.createdAt = {
        gte: targetDateMidnight,
        lt: nextDateMidnight
      };
    }
    if (courseId && courseId !== 'ALL') {
      progressWhere.testResult = {
        student: {
          courseId: Number(courseId)
        }
      };
    }

    const progresses = await prisma.examProgress.findMany({
      where: progressWhere,
      include: {
        examiner: true,
        exam: true,
        testResult: {
          include: {
            student: {
              include: { course: true }
            },
            testType: true,
            vehicle: true,
            scores: {
              include: {
                criterion: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const assignments = await prisma.testAssignment.findMany({
      where: {
        courseId: courseId && courseId !== 'ALL' ? Number(courseId) : undefined
      },
      include: {
        testType: true,
        exam: true
      }
    });

    res.json({ progresses, assignments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
