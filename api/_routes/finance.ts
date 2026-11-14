import { Router } from 'express';
import prisma from '../_prisma';

const router = Router();

// ==========================================
// 1. BIỂU GIÁ HỌC PHÍ (TuitionFeeConfig)
// ==========================================

// Lấy danh sách biểu giá theo courseId (hoặc tất cả)
router.get('/tuition-configs', async (req, res) => {
  try {
    const { courseId } = req.query;
    const where: any = {};
    if (courseId) {
      where.courseId = Number(courseId);
    }
    const configs = await prisma.tuitionFeeConfig.findMany({
      where,
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { studentTuitions: true } }
      },
      orderBy: [{ courseId: 'desc' }, { transmissionType: 'asc' }, { scheduleType: 'asc' }]
    });
    res.json(configs);
  } catch (error: any) {
    console.error('Error fetching tuition configs:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy cấu hình học phí' });
  }
});

// Lưu / Cập nhật cấu hình biểu giá (Hỗ trợ bulk upsert theo khóa học)
router.post('/tuition-configs', async (req, res) => {
  try {
    const { courseId, items } = req.body;
    if (!courseId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ (cần courseId và items[])' });
    }

    const cId = Number(courseId);
    const results = [];

    for (const item of items) {
      const { transmissionType, scheduleType, tuitionAmount, teacherSharePercent, teacherShareAmount, note } = item;
      if (!transmissionType || !scheduleType) continue;

      const record = await prisma.tuitionFeeConfig.upsert({
        where: {
          courseId_transmissionType_scheduleType: {
            courseId: cId,
            transmissionType,
            scheduleType
          }
        },
        create: {
          courseId: cId,
          transmissionType,
          scheduleType,
          tuitionAmount: Number(tuitionAmount || 0),
          teacherSharePercent: Number(teacherSharePercent || 0),
          teacherShareAmount: Number(teacherShareAmount || 0),
          note: note || null
        },
        update: {
          tuitionAmount: Number(tuitionAmount || 0),
          teacherSharePercent: Number(teacherSharePercent || 0),
          teacherShareAmount: Number(teacherShareAmount || 0),
          note: note || null
        }
      });
      results.push(record);
    }

    res.json({ message: 'Lưu cấu hình học phí thành công', data: results });
  } catch (error: any) {
    console.error('Error saving tuition configs:', error);
    res.status(500).json({ error: error.message || 'Lỗi lưu cấu hình học phí' });
  }
});

// Xóa 1 cấu hình biểu giá
router.delete('/tuition-configs/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.tuitionFeeConfig.delete({ where: { id } });
    res.json({ message: 'Xóa cấu hình thành công' });
  } catch (error: any) {
    console.error('Error deleting tuition config:', error);
    res.status(500).json({ error: error.message || 'Lỗi xóa cấu hình' });
  }
});

// ==========================================
// 2. DANH MỤC CÁC KHOẢN GIẢM TRỪ (DeductionCategory)
// ==========================================

// Lấy danh mục khoản trừ
router.get('/deduction-categories', async (req, res) => {
  try {
    const categories = await prisma.deductionCategory.findMany({
      orderBy: [{ isActive: 'desc' }, { id: 'asc' }]
    });
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching deduction categories:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy danh mục khoản trừ' });
  }
});

// Thêm danh mục khoản trừ mới
router.post('/deduction-categories', async (req, res) => {
  try {
    const { name, code, description, defaultAmount, isDefault, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên khoản trừ không được để trống' });
    }

    const cat = await prisma.deductionCategory.create({
      data: {
        name: name.trim(),
        code: code ? code.trim() : null,
        description: description ? description.trim() : null,
        defaultAmount: defaultAmount ? Number(defaultAmount) : 0,
        isDefault: Boolean(isDefault),
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });
    res.json(cat);
  } catch (error: any) {
    console.error('Error creating deduction category:', error);
    res.status(500).json({ error: error.message || 'Lỗi tạo danh mục khoản trừ' });
  }
});

// Cập nhật danh mục khoản trừ
router.put('/deduction-categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, code, description, defaultAmount, isDefault, isActive } = req.body;

    const cat = await prisma.deductionCategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        code: code !== undefined ? (code ? code.trim() : null) : undefined,
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
        defaultAmount: defaultAmount !== undefined ? Number(defaultAmount) : undefined,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      }
    });
    res.json(cat);
  } catch (error: any) {
    console.error('Error updating deduction category:', error);
    res.status(500).json({ error: error.message || 'Lỗi cập nhật danh mục' });
  }
});

// Xóa danh mục khoản trừ
router.delete('/deduction-categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.deductionCategory.delete({ where: { id } });
    res.json({ message: 'Xóa khoản trừ thành công' });
  } catch (error: any) {
    console.error('Error deleting deduction category:', error);
    res.status(500).json({ error: error.message || 'Lỗi xóa khoản trừ' });
  }
});

// ==========================================
// 3. CHÍNH SÁCH / QUY ĐỊNH TẠM ỨNG (AdvancePolicyConfig)
// ==========================================

// Lấy cấu hình chính sách hiện tại
router.get('/advance-policy', async (req, res) => {
  try {
    let policy = await prisma.advancePolicyConfig.findFirst();
    if (!policy) {
      policy = await prisma.advancePolicyConfig.create({
        data: {
          maxAdvancePercent: 70,
          maxAdvanceTimes: 3,
          guidelines: 'Giáo viên được tạm ứng tối đa 70% thù lao ước tính của khóa học trước ngày bế giảng. Vui lòng kiểm tra kỹ danh sách học viên và các khoản khấu trừ trước khi nộp đơn.',
          isActive: true
        }
      });
    }
    res.json(policy);
  } catch (error: any) {
    console.error('Error fetching advance policy:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy quy định tạm ứng' });
  }
});

// Cập nhật cấu hình chính sách
router.post('/advance-policy', async (req, res) => {
  try {
    const { maxAdvancePercent, maxAdvanceTimes, guidelines, isActive } = req.body;
    let policy = await prisma.advancePolicyConfig.findFirst();

    if (policy) {
      policy = await prisma.advancePolicyConfig.update({
        where: { id: policy.id },
        data: {
          maxAdvancePercent: maxAdvancePercent !== undefined ? Number(maxAdvancePercent) : undefined,
          maxAdvanceTimes: maxAdvanceTimes !== undefined ? Number(maxAdvanceTimes) : undefined,
          guidelines: guidelines !== undefined ? guidelines : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined
        }
      });
    } else {
      policy = await prisma.advancePolicyConfig.create({
        data: {
          maxAdvancePercent: Number(maxAdvancePercent || 70),
          maxAdvanceTimes: Number(maxAdvanceTimes || 3),
          guidelines: guidelines || null,
          isActive: isActive !== undefined ? Boolean(isActive) : true
        }
      });
    }

    res.json({ message: 'Cập nhật quy định tạm ứng thành công', policy });
  } catch (error: any) {
    console.error('Error saving advance policy:', error);
    res.status(500).json({ error: error.message || 'Lỗi lưu quy định tạm ứng' });
  }
});

// ==========================================
// 4. HỌC PHÍ HỌC VIÊN (StudentTuition)
// ==========================================

// Lấy danh sách học viên của 1 khóa học kèm thông tin học phí
router.get('/students-tuition', async (req, res) => {
  try {
    const { courseId, teacherId } = req.query;
    if (!courseId) {
      return res.status(400).json({ error: 'Thiếu tham số courseId' });
    }

    const where: any = { courseId: Number(courseId) };
    if (teacherId) {
      where.teacherId = Number(teacherId);
    }

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        name: true,
        cccd: true,
        courseId: true,
        courseName: true,
        teacherId: true,
        teacher: { select: { id: true, name: true, username: true } },
        tuitionInfo: {
          include: {
            tuitionConfig: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(students);
  } catch (error: any) {
    console.error('Error fetching students tuition:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy học phí học viên' });
  }
});

// Cập nhật thông tin học phí cho từng học viên
router.post('/student-tuition', async (req, res) => {
  try {
    const { studentId, transmissionType, scheduleType, tuitionConfigId, tuitionAmount, teacherSharePercent, teacherEarnedAmount, isPaid, paidAmount, note } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Thiếu studentId' });
    }

    const sId = Number(studentId);

    const record = await prisma.studentTuition.upsert({
      where: { studentId: sId },
      create: {
        studentId: sId,
        tuitionConfigId: tuitionConfigId ? Number(tuitionConfigId) : null,
        transmissionType: transmissionType || 'MANUAL',
        scheduleType: scheduleType || 'WEEKDAY',
        tuitionAmount: Number(tuitionAmount || 0),
        teacherSharePercent: Number(teacherSharePercent || 0),
        teacherEarnedAmount: Number(teacherEarnedAmount || 0),
        isPaid: Boolean(isPaid),
        paidAmount: Number(paidAmount || 0),
        note: note || null
      },
      update: {
        tuitionConfigId: tuitionConfigId ? Number(tuitionConfigId) : undefined,
        transmissionType: transmissionType || undefined,
        scheduleType: scheduleType || undefined,
        tuitionAmount: tuitionAmount !== undefined ? Number(tuitionAmount) : undefined,
        teacherSharePercent: teacherSharePercent !== undefined ? Number(teacherSharePercent) : undefined,
        teacherEarnedAmount: teacherEarnedAmount !== undefined ? Number(teacherEarnedAmount) : undefined,
        isPaid: isPaid !== undefined ? Boolean(isPaid) : undefined,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
        note: note !== undefined ? note : undefined
      }
    });

    res.json(record);
  } catch (error: any) {
    console.error('Error updating student tuition:', error);
    res.status(500).json({ error: error.message || 'Lỗi cập nhật học phí học viên' });
  }
});

export default router;
