import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
