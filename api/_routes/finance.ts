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

    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching advance requests:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy danh sách đơn tạm ứng' });
  }
});

// Lấy thông tin tóm tắt & tính toán cho Giáo viên trước khi tạo đơn
router.get('/advance-estimate', async (req, res) => {
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
    const studentBreakdown = students.map(s => {
      let earned = 0;
      let tuition = 0;
      let percent = 0;
      let trans = s.tuitionInfo?.transmissionType || 'MANUAL';
      let sched = s.tuitionInfo?.scheduleType || 'WEEKDAY';

      if (s.tuitionInfo && s.tuitionInfo.teacherEarnedAmount > 0) {
        earned = s.tuitionInfo.teacherEarnedAmount;
        tuition = s.tuitionInfo.tuitionAmount;
        percent = s.tuitionInfo.teacherSharePercent;
      } else {
        // Fallback theo biểu giá khóa học
        const cfg = configs.find(c => c.transmissionType === trans && c.scheduleType === sched);
        if (cfg) {
          tuition = cfg.tuitionAmount;
          percent = cfg.teacherSharePercent;
          earned = (tuition * percent) / 100;
        }
      }

      grossEstimatedAmount += earned;

      return {
        id: s.id,
        name: s.name,
        cccd: s.cccd,
        transmissionType: trans,
        scheduleType: sched,
        tuitionAmount: tuition,
        teacherSharePercent: percent,
        earnedAmount: earned
      };
    });

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
      if (s.tuitionInfo && s.tuitionInfo.teacherEarnedAmount > 0) {
        grossEstimatedAmount += s.tuitionInfo.teacherEarnedAmount;
      } else {
        const trans = s.tuitionInfo?.transmissionType || 'MANUAL';
        const sched = s.tuitionInfo?.scheduleType || 'WEEKDAY';
        const cfg = configs.find(c => c.transmissionType === trans && c.scheduleType === sched);
        if (cfg) {
          grossEstimatedAmount += (cfg.tuitionAmount * cfg.teacherSharePercent) / 100;
        }
      }
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

// Xóa hoặc Hủy phiếu tạm ứng (chỉ khi đang ở trạng thái PENDING)
router.delete('/advance-requests/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const request = await prisma.advancePaymentRequest.findUnique({ where: { id } });

    if (!request) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Không thể xóa phiếu đã được xử lý hoặc chi tiền' });
    }

    await prisma.advancePaymentRequest.delete({ where: { id } });
    res.json({ message: 'Xóa phiếu đề nghị tạm ứng thành công' });
  } catch (error: any) {
    console.error('Error deleting advance request:', error);
    res.status(500).json({ error: error.message || 'Lỗi xóa phiếu tạm ứng' });
  }
});

export default router;
