import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.trainingSession.findMany({
      include: {
        trainingGround: true,
        trainingShift: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(sessions);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  const { trainingGroundId, trainingShiftId, vehicles, date } = req.body;
  try {
    const session = await prisma.trainingSession.create({
      data: { 
        trainingGroundId: Number(trainingGroundId), 
        trainingShiftId: Number(trainingShiftId), 
        vehicles, 
        date: new Date(date) 
      }
    });
    res.json(session);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { trainingGroundId, trainingShiftId, vehicles, date } = req.body;
  try {
    const session = await prisma.trainingSession.update({
      where: { id: Number(id) },
      data: { 
        trainingGroundId: Number(trainingGroundId), 
        trainingShiftId: Number(trainingShiftId), 
        vehicles, 
        date: new Date(date) 
      }
    });
    res.json(session);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.trainingSession.delete({ where: { id } });
    res.json({ success: true, message: 'Đã xoá Đợt tập xe' });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
