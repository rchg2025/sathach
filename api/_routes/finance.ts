import { Router } from 'express';
import prisma from '../_prisma';

const router = Router();

// Helper xác định tỉ lệ % thù lao của giáo viên:
// Ưu tiên 1: Cấu hình riêng cho Giáo viên (TeacherRateConfig)
// Ưu tiên 2: Cấu hình theo Khóa học (TuitionFeeConfig)
async function getEffectiveTeacherRate(
  teacherId: number,
  courseId: number,
  transmissionType: string,
  scheduleType: string,
  courseDefaultPercent: number
): Promise<number> {
  // Tìm cấu hình riêng cho GV
  const specificRate = await prisma.teacherRateConfig.findFirst({
    where: {
      teacherId,
      OR: [
        { courseId, transmissionType, scheduleType },
        { courseId, transmissionType: null, scheduleType: null },
        { courseId: null, transmissionType, scheduleType },
        { courseId: null, transmissionType: null, scheduleType: null }
      ]
    },
    orderBy: [
      { courseId: 'desc' }, // Cấu hình có courseId cụ thể ưu tiên hơn
      { transmissionType: 'desc' }
    ]
  });

  if (specificRate && specificRate.ratePercent !== null && specificRate.ratePercent !== undefined) {
    return specificRate.ratePercent;
  }
  return courseDefaultPercent;
}

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

// Cập nhật hàng loạt (batch update) phân loại xe & lịch học cho học viên
router.post('/students-tuition-batch', async (req, res) => {
  try {
    const { items, courseId } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ (items[])' });
    }

    // Lấy trước các cấu hình học phí của khóa học (nếu có courseId)
    let configs: any[] = [];
    if (courseId) {
      configs = await prisma.tuitionFeeConfig.findMany({
        where: { courseId: Number(courseId) }
      });
    }

    const updated = [];
    for (const item of items) {
      const { studentId, transmissionType, scheduleType } = item;
      if (!studentId) continue;

      const sId = Number(studentId);
      const trans = transmissionType || 'MANUAL';
      const sched = scheduleType || 'WEEKDAY';

      // Tìm config tương ứng
      const matchedConfig = configs.find(c => c.transmissionType === trans && c.scheduleType === sched);
      const tuitionAmount = matchedConfig ? matchedConfig.tuitionAmount : 0;
      const teacherSharePercent = matchedConfig ? matchedConfig.teacherSharePercent : 0;
      const teacherEarnedAmount = (tuitionAmount * teacherSharePercent) / 100;

      const record = await prisma.studentTuition.upsert({
        where: { studentId: sId },
        create: {
          studentId: sId,
          tuitionConfigId: matchedConfig ? matchedConfig.id : null,
          transmissionType: trans,
          scheduleType: sched,
          tuitionAmount,
          teacherSharePercent,
          teacherEarnedAmount,
        },
        update: {
          tuitionConfigId: matchedConfig ? matchedConfig.id : null,
          transmissionType: trans,
          scheduleType: sched,
          tuitionAmount,
          teacherSharePercent,
          teacherEarnedAmount,
        }
      });
      updated.push(record);
    }

    res.json({ message: 'Cập nhật phân loại học phí thành công', count: updated.length });
  } catch (error: any) {
    console.error('Error batch updating students tuition:', error);
    res.status(500).json({ error: error.message || 'Lỗi cập nhật học phí học viên' });
  }
});

// ==========================================
// 5. ĐƠN ĐĂNG KÝ TẠM ỨNG (AdvancePaymentRequest)
// ==========================================

// Lấy số lượng đơn tạm ứng đang ở trạng thái PENDING (chờ duyệt)
router.get('/advance-requests/pending-count', async (req, res) => {
  try {
    const count = await prisma.advancePaymentRequest.count({
      where: { status: 'PENDING' }
    });
    res.json({ count });
  } catch (error: any) {
    console.error('Error fetching pending advance count:', error);
    res.status(500).json({ error: error.message || 'Lỗi đếm số đơn chờ duyệt' });
  }
});

// Lấy danh sách đơn tạm ứng (Kế toán xem tất cả, Giáo viên chỉ xem của mình)
router.get('/advance-requests', async (req, res) => {
  try {
    const { teacherId, courseId, status } = req.query;
    const where: any = {};

    if (teacherId) where.teacherId = Number(teacherId);
    if (courseId) where.courseId = Number(courseId);
    if (status && status !== 'ALL') where.status = String(status);

    const requests = await prisma.advancePaymentRequest.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, username: true, phone: true } },
        course: { select: { id: true, name: true, startDate: true, endDate: true } },
        deductions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Lấy thông tin học sinh & tổng học phí cho từng request
    const requestsWithStudents = await Promise.all(
      requests.map(async (r) => {
        const students = await prisma.student.findMany({
          where: { teacherId: r.teacherId, courseId: r.courseId },
          include: {
            tuitionInfo: { include: { tuitionConfig: true } }
          }
        });

        const configs = await prisma.tuitionFeeConfig.findMany({ where: { courseId: r.courseId } });

        const studentBreakdown = [];
        let totalTuitionAmount = 0;

        for (const s of students) {
          const trans = s.tuitionInfo?.transmissionType || 'MANUAL';
          const sched = s.tuitionInfo?.scheduleType || 'WEEKDAY';
          const cfg = configs.find(c => c.transmissionType === trans && c.scheduleType === sched);
          const tuition = s.tuitionInfo?.tuitionAmount || (cfg ? cfg.tuitionAmount : 0);
          const defaultCoursePercent = cfg ? cfg.teacherSharePercent : 0;
          const percent = await getEffectiveTeacherRate(r.teacherId, r.courseId, trans, sched, s.tuitionInfo?.teacherSharePercent || defaultCoursePercent);
          const earned = (tuition * percent) / 100;

          totalTuitionAmount += tuition;

          studentBreakdown.push({
            id: s.id,
            name: s.name,
            cccd: s.cccd,
            transmissionType: trans,
            scheduleType: sched,
            tuitionAmount: tuition,
            teacherSharePercent: percent,
            earnedAmount: earned
          });
        }

        return {
          ...r,
          totalTuitionAmount,
          students: studentBreakdown
        };
      })
    );

    res.json(requestsWithStudents);
  } catch (error: any) {
    console.error('Error fetching advance requests:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy danh sách đơn tạm ứng' });
  }
});

// Lấy thông tin tóm tắt & tính toán cho Giáo viên trước khi tạo đơn
router.get(['/advance-estimate', '/estimate'], async (req, res) => {
  try {
    const { teacherId, courseId } = req.query;
    if (!teacherId || !courseId) {
      return res.status(400).json({ error: 'Thiếu teacherId hoặc courseId' });
    }

    const tId = Number(teacherId);
    const cId = Number(courseId);

    // 1. Lấy danh sách học viên của GV trong khóa
    const students = await prisma.student.findMany({
      where: { teacherId: tId, courseId: cId },
      include: {
        tuitionInfo: { include: { tuitionConfig: true } }
      }
    });

    // 2. Lấy cấu hình biểu giá của khóa để fallback nếu học viên chưa có thông tin
    const configs = await prisma.tuitionFeeConfig.findMany({ where: { courseId: cId } });

    // 3. Tính toán tổng thù lao
    let grossEstimatedAmount = 0;
    const studentBreakdown = [];

    for (const s of students) {
      let earned = 0;
      let tuition = 0;
      let percent = 0;
      let trans = s.tuitionInfo?.transmissionType || 'MANUAL';
      let sched = s.tuitionInfo?.scheduleType || 'WEEKDAY';

      const cfg = configs.find(c => c.transmissionType === trans && c.scheduleType === sched);
      tuition = s.tuitionInfo?.tuitionAmount || (cfg ? cfg.tuitionAmount : 0);
      const defaultCoursePercent = cfg ? cfg.teacherSharePercent : 0;

      // Ưu tiên tỉ lệ cài riêng cho GV
      percent = await getEffectiveTeacherRate(tId, cId, trans, sched, s.tuitionInfo?.teacherSharePercent || defaultCoursePercent);
      earned = (tuition * percent) / 100;

      grossEstimatedAmount += earned;

      studentBreakdown.push({
        id: s.id,
        name: s.name,
        cccd: s.cccd,
        transmissionType: trans,
        scheduleType: sched,
        tuitionAmount: tuition,
        teacherSharePercent: percent,
        earnedAmount: earned
      });
    }

    // 4. Lấy quy định tạm ứng
    let policy = await prisma.advancePolicyConfig.findFirst();
    const maxPercent = policy?.maxAdvancePercent || 70;
    const maxTimes = policy?.maxAdvanceTimes || 3;

    // 5. Kiểm tra lịch sử các đơn đã duyệt / đã nộp trong khóa này của GV
    const existingRequests = await prisma.advancePaymentRequest.findMany({
      where: {
        teacherId: tId,
        courseId: cId,
        status: { in: ['PENDING', 'APPROVED', 'PAID'] }
      }
    });

    const totalPreviouslyRequested = existingRequests.reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0);
    const maxAdvanceAllowedTotal = (grossEstimatedAmount * maxPercent) / 100;
    const remainingAdvanceAllowed = Math.max(0, maxAdvanceAllowedTotal - totalPreviouslyRequested);

    res.json({
      teacherId: tId,
      courseId: cId,
      studentCount: students.length,
      grossEstimatedAmount,
      maxAdvancePercent: maxPercent,
      maxAdvanceTimes: maxTimes,
      existingRequestCount: existingRequests.length,
      totalPreviouslyRequested,
      maxAdvanceAllowedTotal,
      remainingAdvanceAllowed,
      students: studentBreakdown,
      policyGuidelines: policy?.guidelines || ''
    });
  } catch (error: any) {
    console.error('Error estimating advance payment:', error);
    res.status(500).json({ error: error.message || 'Lỗi tính toán mức tạm ứng' });
  }
});

// Tạo đơn đăng ký tạm ứng mới
router.post('/advance-requests', async (req, res) => {
  try {
    const { teacherId, courseId, requestedAmount, reason, deductions } = req.body;

    if (!teacherId || !courseId || !requestedAmount) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin đề nghị tạm ứng' });
    }

    const tId = Number(teacherId);
    const cId = Number(courseId);
    const reqAmount = Number(requestedAmount);

    // Tính toán lại hạn mức để đảm bảo an toàn backend
    const students = await prisma.student.findMany({
      where: { teacherId: tId, courseId: cId },
      include: { tuitionInfo: true }
    });

    const configs = await prisma.tuitionFeeConfig.findMany({ where: { courseId: cId } });

    let grossEstimatedAmount = 0;
    for (const s of students) {
      const trans = s.tuitionInfo?.transmissionType || 'MANUAL';
      const sched = s.tuitionInfo?.scheduleType || 'WEEKDAY';
      const cfg = configs.find(c => c.transmissionType === trans && c.scheduleType === sched);
      const tuition = s.tuitionInfo?.tuitionAmount || (cfg ? cfg.tuitionAmount : 0);
      const defaultCoursePercent = cfg ? cfg.teacherSharePercent : 0;
      const percent = await getEffectiveTeacherRate(tId, cId, trans, sched, s.tuitionInfo?.teacherSharePercent || defaultCoursePercent);
      grossEstimatedAmount += (tuition * percent) / 100;
    }

    const policy = await prisma.advancePolicyConfig.findFirst();
    const maxPercent = policy?.maxAdvancePercent || 70;
    const maxTimes = policy?.maxAdvanceTimes || 3;

    // Check số lần
    const existingRequests = await prisma.advancePaymentRequest.findMany({
      where: { teacherId: tId, courseId: cId, status: { in: ['PENDING', 'APPROVED', 'PAID'] } }
    });

    if (existingRequests.length >= maxTimes) {
      return res.status(400).json({ error: `Bạn đã đạt giới hạn tối đa ${maxTimes} lần tạm ứng cho khóa học này` });
    }

    const maxAllowedAmount = (grossEstimatedAmount * maxPercent) / 100;
    const alreadyAdvanced = existingRequests.reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0);
    const remainingLimit = Math.max(0, maxAllowedAmount - alreadyAdvanced);

    if (reqAmount > remainingLimit) {
      return res.status(400).json({ 
        error: `Số tiền đề nghị (${reqAmount.toLocaleString('vi-VN')} đ) vượt quá hạn mức còn lại được phép tạm ứng (${remainingLimit.toLocaleString('vi-VN')} đ)` 
      });
    }

    // Tính tổng các khoản trừ
    let totalDeductions = 0;
    const deductionsData: any[] = [];
    if (deductions && Array.isArray(deductions)) {
      for (const d of deductions) {
        const damount = Number(d.amount || 0);
        totalDeductions += damount;
        deductionsData.push({
          deductionCategoryId: d.deductionCategoryId ? Number(d.deductionCategoryId) : null,
          name: d.name || 'Khoản trừ',
          amount: damount,
          note: d.note || null
        });
      }
    }

    // Sinh mã phiếu duy nhất TU-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await prisma.advancePaymentRequest.count();
    const requestCode = `TU-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

    const newRequest = await prisma.advancePaymentRequest.create({
      data: {
        requestCode,
        teacherId: tId,
        courseId: cId,
        studentCount: students.length,
        grossEstimatedAmount,
        maxAllowedAmount,
        totalDeductions,
        requestedAmount: reqAmount,
        status: 'PENDING',
        reason: reason || null,
        deductions: {
          create: deductionsData
        }
      },
      include: {
        deductions: true,
        teacher: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } }
      }
    });

    res.json({ message: 'Nộp đơn đề nghị tạm ứng thành công', request: newRequest });
  } catch (error: any) {
    console.error('Error creating advance request:', error);
    res.status(500).json({ error: error.message || 'Lỗi nộp đơn tạm ứng' });
  }
});

// Kế toán phê duyệt / Từ chối / Chi tiền đơn tạm ứng
router.post('/advance-requests/:id/action', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, approvedAmount, accountantNotes, paymentReference, accountantName } = req.body;

    const request = await prisma.advancePaymentRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu đề nghị tạm ứng' });
    }

    const now = new Date();
    let updateData: any = {};

    if (action === 'APPROVE') {
      updateData = {
        status: 'APPROVED',
        approvedAmount: approvedAmount !== undefined ? Number(approvedAmount) : request.requestedAmount,
        accountantNotes: accountantNotes || request.accountantNotes,
        approvedBy: accountantName || 'Kế toán',
        approvedAt: now
      };
    } else if (action === 'REJECT') {
      updateData = {
        status: 'REJECTED',
        accountantNotes: accountantNotes || 'Kế toán không phê duyệt đơn này',
        approvedBy: accountantName || 'Kế toán',
        approvedAt: now
      };
    } else if (action === 'PAY') {
      updateData = {
        status: 'PAID',
        approvedAmount: approvedAmount !== undefined ? Number(approvedAmount) : (request.approvedAmount || request.requestedAmount),
        paymentReference: paymentReference || null,
        accountantNotes: accountantNotes || request.accountantNotes,
        paidAt: now
      };
    } else {
      return res.status(400).json({ error: 'Hành động không hợp lệ (APPROVE | REJECT | PAY)' });
    }

    const updated = await prisma.advancePaymentRequest.update({
      where: { id },
      data: updateData,
      include: {
        teacher: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        deductions: true
      }
    });

    res.json({ message: 'Cập nhật trạng thái phiếu thành công', request: updated });
  } catch (error: any) {
    console.error('Error processing advance request action:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý phiếu tạm ứng' });
  }
});

// Xóa hoặc Hủy phiếu tạm ứng (Superadmin 'quantri' có toàn quyền xóa mọi trạng thái, tài khoản khác chỉ xóa khi PENDING)
router.delete('/advance-requests/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { username } = req.query;

    const request = await prisma.advancePaymentRequest.findUnique({ where: { id } });

    if (!request) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu đề nghị tạm ứng' });
    }

    const isSuperAdmin = username === 'quantri';

    if (!isSuperAdmin && request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Không thể xóa phiếu đã được xử lý hoặc chi tiền (Chỉ superadmin quantri mới có quyền xóa)' });
    }

    // Xóa các khoản deductions liên quan (nếu có onDelete Cascade hoặc xóa tay)
    await prisma.advancePaymentDeduction.deleteMany({ where: { requestId: id } });
    await prisma.advancePaymentRequest.delete({ where: { id } });

    res.json({ message: 'Xóa phiếu đề nghị tạm ứng thành công' });
  } catch (error: any) {
    console.error('Error deleting advance request:', error);
    res.status(500).json({ error: error.message || 'Lỗi xóa phiếu tạm ứng' });
  }
});

// ==========================================
// 6. CẤU HÌNH TỈ LỆ HƯỞNG THEO GIÁO VIÊN (TeacherRateConfig)
// ==========================================

// Lấy danh sách tỉ lệ theo giáo viên
router.get('/teacher-rates', async (req, res) => {
  try {
    const { teacherId, courseId } = req.query;
    const where: any = {};
    if (teacherId) where.teacherId = Number(teacherId);
    if (courseId) where.courseId = Number(courseId);

    const rates = await prisma.teacherRateConfig.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, username: true } },
        course: { select: { id: true, name: true } }
      },
      orderBy: [{ teacherId: 'asc' }, { id: 'desc' }]
    });

    res.json(rates);
  } catch (error: any) {
    console.error('Error fetching teacher rates:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy cấu hình tỉ lệ giáo viên' });
  }
});

// Lưu / Cập nhật cấu hình tỉ lệ cho giáo viên
router.post('/teacher-rates', async (req, res) => {
  try {
    const { teacherId, courseId, transmissionType, scheduleType, ratePercent, note } = req.body;

    if (!teacherId || ratePercent === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin teacherId hoặc ratePercent' });
    }

    const tId = Number(teacherId);
    const cId = courseId ? Number(courseId) : null;
    const trans = transmissionType || null;
    const sched = scheduleType || null;
    const percent = Number(ratePercent);

    // Tìm xem đã tồn tại cấu hình tương ứng chưa
    const existing = await prisma.teacherRateConfig.findFirst({
      where: {
        teacherId: tId,
        courseId: cId,
        transmissionType: trans,
        scheduleType: sched
      }
    });

    let result;
    if (existing) {
      result = await prisma.teacherRateConfig.update({
        where: { id: existing.id },
        data: {
          ratePercent: percent,
          note: note !== undefined ? note : undefined
        }
      });
    } else {
      result = await prisma.teacherRateConfig.create({
        data: {
          teacherId: tId,
          courseId: cId,
          transmissionType: trans,
          scheduleType: sched,
          ratePercent: percent,
          note: note || null
        }
      });
    }

    res.json({ message: 'Lưu tỉ lệ hưởng cho giáo viên thành công', data: result });
  } catch (error: any) {
    console.error('Error saving teacher rate:', error);
    res.status(500).json({ error: error.message || 'Lỗi lưu cấu hình tỉ lệ giáo viên' });
  }
});

// Xóa cấu hình tỉ lệ giáo viên
router.delete('/teacher-rates/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.teacherRateConfig.delete({ where: { id } });
    res.json({ message: 'Xóa tỉ lệ cấu hình thành công' });
  } catch (error: any) {
    console.error('Error deleting teacher rate:', error);
    res.status(500).json({ error: error.message || 'Lỗi xóa cấu hình' });
  }
});

// ==========================================
// 6. QUYẾT TOÁN / THANH TOÁN CUỐI KHÓA CHO GIÁO VIÊN (Settlements)
// ==========================================

// Lấy danh sách tổng hợp theo Giáo viên & Khóa học để chuẩn bị thanh toán cuối khóa
router.get('/settlement-summary', async (req, res) => {
  try {
    const { courseId, teacherId } = req.query;

    const studentWhere: any = {
      teacherId: { not: null },
      courseId: { not: null }
    };
    if (courseId) studentWhere.courseId = Number(courseId);
    if (teacherId) studentWhere.teacherId = Number(teacherId);

    // Lấy các cặp teacherId, courseId có học viên
    const pairs = await prisma.student.groupBy({
      by: ['teacherId', 'courseId'],
      where: studentWhere,
      _count: { id: true }
    });

    const results = await Promise.all(
      pairs.map(async (p) => {
        if (!p.teacherId || !p.courseId) return null;

        const teacher = await prisma.user.findUnique({
          where: { id: p.teacherId },
          select: { id: true, name: true, username: true, phone: true }
        });
        const course = await prisma.course.findUnique({
          where: { id: p.courseId },
          select: { id: true, name: true, startDate: true, endDate: true }
        });

        if (!teacher || !course) return null;

        // Lấy danh sách học viên
        const students = await prisma.student.findMany({
          where: { teacherId: p.teacherId, courseId: p.courseId },
          include: {
            tuitionInfo: { include: { tuitionConfig: true } }
          }
        });

        const configs = await prisma.tuitionFeeConfig.findMany({ where: { courseId: p.courseId } });

        let totalTuition = 0;
        let grossEarned = 0;
        const studentBreakdown = [];

        for (const s of students) {
          const trans = s.tuitionInfo?.transmissionType || 'MANUAL';
          const sched = s.tuitionInfo?.scheduleType || 'WEEKDAY';
          const cfg = configs.find(c => c.transmissionType === trans && c.scheduleType === sched);
          const tuition = s.tuitionInfo?.tuitionAmount || (cfg ? cfg.tuitionAmount : 0);
          const defaultCoursePercent = cfg ? cfg.teacherSharePercent : 0;
          const percent = await getEffectiveTeacherRate(p.teacherId, p.courseId, trans, sched, s.tuitionInfo?.teacherSharePercent || defaultCoursePercent);
          const earned = (tuition * percent) / 100;

          totalTuition += tuition;
          grossEarned += earned;

          studentBreakdown.push({
            id: s.id,
            name: s.name,
            cccd: s.cccd,
            transmissionType: trans,
            scheduleType: sched,
            tuitionAmount: tuition,
            teacherSharePercent: percent,
            earnedAmount: earned
          });
        }

        // Lấy các đơn tạm ứng & quyết toán của GV trong khóa
        const allRequests = await prisma.advancePaymentRequest.findMany({
          where: { teacherId: p.teacherId, courseId: p.courseId },
          include: { deductions: true },
          orderBy: { createdAt: 'desc' }
        });

        // Tạm ứng đã duyệt/đã chi (TU-...)
        const advanceRequests = allRequests.filter(r => !r.requestCode.startsWith('QT-'));
        const totalAdvancePaid = advanceRequests
          .filter(r => r.status === 'PAID')
          .reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0);

        const totalAdvancePendingOrApproved = advanceRequests
          .filter(r => r.status === 'PENDING' || r.status === 'APPROVED')
          .reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0);

        // Quyết toán (QT-...)
        const settlementRequests = allRequests.filter(r => r.requestCode.startsWith('QT-'));
        const totalSettledPaid = settlementRequests
          .filter(r => r.status === 'PAID')
          .reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0);

        const isFullySettled = settlementRequests.some(r => r.status === 'PAID');

        // Số tiền còn lại chưa thanh toán
        const remainingToPay = Math.max(0, grossEarned - totalAdvancePaid - totalSettledPaid);

        return {
          teacher,
          course,
          studentCount: students.length,
          totalTuition,
          grossEarned,
          totalAdvancePaid,
          totalAdvancePendingOrApproved,
          totalSettledPaid,
          remainingToPay,
          isFullySettled,
          advanceRequests,
          settlementRequests,
          students: studentBreakdown
        };
      })
    );

    const validResults = results.filter(Boolean);
    res.json(validResults);
  } catch (error: any) {
    console.error('Error fetching settlement summary:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy danh sách quyết toán' });
  }
});

// Kế toán thực hiện Thanh toán / Quyết toán cuối khóa cho Giáo viên
router.post('/settlement', async (req, res) => {
  try {
    const {
      teacherId,
      courseId,
      finalAmount,
      deductions,
      accountantNotes,
      paymentReference,
      accountantName
    } = req.body;

    if (!teacherId || !courseId) {
      return res.status(400).json({ error: 'Thiếu teacherId hoặc courseId' });
    }

    const tId = Number(teacherId);
    const cId = Number(courseId);
    const payAmount = Number(finalAmount || 0);

    // Tính toán lại tổng thù lao
    const students = await prisma.student.findMany({
      where: { teacherId: tId, courseId: cId },
      include: { tuitionInfo: true }
    });

    const configs = await prisma.tuitionFeeConfig.findMany({ where: { courseId: cId } });

    let grossEstimatedAmount = 0;
    for (const s of students) {
      const trans = s.tuitionInfo?.transmissionType || 'MANUAL';
      const sched = s.tuitionInfo?.scheduleType || 'WEEKDAY';
      const cfg = configs.find(c => c.transmissionType === trans && c.scheduleType === sched);
      const tuition = s.tuitionInfo?.tuitionAmount || (cfg ? cfg.tuitionAmount : 0);
      const defaultCoursePercent = cfg ? cfg.teacherSharePercent : 0;
      const percent = await getEffectiveTeacherRate(tId, cId, trans, sched, s.tuitionInfo?.teacherSharePercent || defaultCoursePercent);
      grossEstimatedAmount += (tuition * percent) / 100;
    }

    // Các khoản trừ thêm
    let totalDeductions = 0;
    const deductionsData: any[] = [];
    if (deductions && Array.isArray(deductions)) {
      for (const d of deductions) {
        const damount = Number(d.amount || 0);
        totalDeductions += damount;
        deductionsData.push({
          deductionCategoryId: d.deductionCategoryId ? Number(d.deductionCategoryId) : null,
          name: d.name || 'Khoản trừ cuối khóa',
          amount: damount,
          note: d.note || null
        });
      }
    }

    // Sinh mã phiếu quyết toán: QT-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await prisma.advancePaymentRequest.count({
      where: { requestCode: { startsWith: `QT-${yearMonth}` } }
    });
    const requestCode = `QT-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

    const settlementRecord = await prisma.advancePaymentRequest.create({
      data: {
        requestCode,
        teacherId: tId,
        courseId: cId,
        studentCount: students.length,
        grossEstimatedAmount,
        maxAllowedAmount: grossEstimatedAmount,
        totalDeductions,
        requestedAmount: payAmount,
        approvedAmount: payAmount,
        status: 'PAID', // Quyết toán thanh toán trực tiếp
        reason: 'Quyết toán thanh toán kết thúc khóa học',
        accountantNotes: accountantNotes || 'Thanh toán toàn bộ thù lao còn lại cuối khóa',
        paymentReference: paymentReference || null,
        approvedBy: accountantName || 'Kế toán',
        approvedAt: now,
        paidAt: now,
        deductions: {
          create: deductionsData
        }
      },
      include: {
        teacher: { select: { id: true, name: true, username: true } },
        course: { select: { id: true, name: true } },
        deductions: true
      }
    });

    res.json({ message: 'Xác nhận thanh toán cuối khóa thành công', settlement: settlementRecord });
  } catch (error: any) {
    console.error('Error creating settlement:', error);
    res.status(500).json({ error: error.message || 'Lỗi thực hiện thanh toán cuối khóa' });
  }
});

export default router;
