import { Router } from 'express';
import prisma from '../_prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const grounds = await prisma.trainingGround.findMany({ orderBy: { id: 'desc' } });
    res.json(grounds);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  const { name, address, phone, email, mapUrl } = req.body;
  try {
    const ground = await prisma.trainingGround.create({
      data: { name, address, phone, email, mapUrl }
    });
    res.json(ground);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, email, mapUrl } = req.body;
  try {
    const ground = await prisma.trainingGround.update({
      where: { id: Number(id) },
      data: { name, address, phone, email, mapUrl }
    });
    res.json(ground);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.trainingGround.delete({ where: { id } });
    res.json({ success: true, message: 'Đã xoá Sân tập' });
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Không thể xoá vì đang có dữ liệu liên kết.'});
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
