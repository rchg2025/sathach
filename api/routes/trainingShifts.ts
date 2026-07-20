import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const shifts = await prisma.trainingShift.findMany({ orderBy: { id: 'desc' } });
    res.json(shifts);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  const { name, startTime, endTime } = req.body;
  try {
    const shift = await prisma.trainingShift.create({
      data: { name, startTime, endTime }
    });
    res.json(shift);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, startTime, endTime } = req.body;
  try {
    const shift = await prisma.trainingShift.update({
      where: { id: Number(id) },
      data: { name, startTime, endTime }
    });
    res.json(shift);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.trainingShift.delete({ where: { id } });
    res.json({ success: true, message: 'Đã xoá Ca tập' });
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
