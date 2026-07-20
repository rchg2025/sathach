import { Router } from 'express';
import prisma from '../_prisma';

const router = Router();

// Lấy danh sách các ca tập khả dụng cho đăng ký
router.get('/sessions', async (req, res) => {
  try {
    const now = new Date();
    
    // Lấy các session có date >= today, vì qua ngày thì không đăng ký được
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await prisma.trainingSession.findMany({
      where: {
        date: { gte: today },
      },
      include: {
        trainingGround: true,
        trainingShift: true,
        registrations: {
          include: { user: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    
    res.json(sessions);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// Người dùng đăng ký xe
router.post('/register', async (req, res) => {
  const { trainingSessionId, vehicle, userId } = req.body;
  try {
    // 1. Kiểm tra session có tồn tại và trong thời gian mở đăng ký không
    const session = await prisma.trainingSession.findUnique({
      where: { id: Number(trainingSessionId) }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Không tìm thấy đợt tập xe' });
    }

    const now = new Date();
    const openTime = session.registrationStartTime;
    const closeTime = session.registrationEndTime;

    if (openTime && now < openTime) {
      return res.status(400).json({ error: 'Chưa đến thời gian mở đăng ký' });
    }
    if (closeTime && now > closeTime) {
      return res.status(400).json({ error: 'Đã hết thời gian đăng ký' });
    }

    // 2. Kiểm tra giới hạn 1 xe/ngày
    const startOfDay = new Date(session.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(session.date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingRegistration = await prisma.trainingRegistration.findFirst({
      where: {
        userId: Number(userId),
        trainingSession: {
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }
    });

    if (existingRegistration) {
      return res.status(400).json({ error: 'Bạn đã đăng ký 1 xe trong ngày này rồi. Mỗi tài khoản chỉ được đăng ký tối đa 1 xe mỗi ngày!' });
    }

    // 3. Kiểm tra xem xe này có trong danh sách xe của session không
    const vehiclesArr = session.vehicles.split(',').map((v: string) => v.trim()).filter((v: string) => v);
    if (!vehiclesArr.includes(vehicle)) {
      return res.status(400).json({ error: 'Xe này không thuộc đợt tập' });
    }

    // 3. Đăng ký xe
    const registration = await prisma.trainingRegistration.create({
      data: {
        trainingSessionId: Number(trainingSessionId),
        userId: Number(userId),
        vehicle
      }
    });

    res.json({ success: true, registration });
  } catch (error: any) { 
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Xe này đã có người đăng ký, vui lòng chọn xe khác!' });
    }
    console.error(error);
    res.status(500).json({ error: 'Lỗi server' }); 
  }
});

// Hủy đăng ký xe
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { userId } = req.body; // Gửi kèm userId để check quyền
  try {
    const reg = await prisma.trainingRegistration.findUnique({ where: { id } });
    if (!reg) return res.status(404).json({ error: 'Không tìm thấy đăng ký' });
    
    // Check role, chỉ cho phép hủy nếu là của mình hoặc Admin/Manager
    // Tạm thời cho phép hủy nếu userId trùng
    if (reg.userId !== Number(userId)) {
      return res.status(403).json({ error: 'Không có quyền hủy' });
    }
    
    await prisma.trainingRegistration.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Lấy danh sách đăng ký của user hiện tại
router.get('/my-registrations', async (req, res) => {
  const { userId } = req.query;
  try {
    const regs = await prisma.trainingRegistration.findMany({
      where: { userId: Number(userId) },
      include: {
        trainingSession: {
          include: {
            trainingGround: true,
            trainingShift: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(regs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

export default router;
