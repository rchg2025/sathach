import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper to get settings
const getSetting = async (key: string) => {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value || '';
};

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

router.post('/google-login', async (req, res) => {
  const { credential } = req.body;
  try {
    const clientId = await getSetting('google_client_id');
    if (!clientId) return res.status(400).json({ error: 'Chưa cấu hình Google Client ID trên hệ thống' });

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: 'Không lấy được email từ Google' });
    
    const email = payload.email;
    const user = await prisma.user.findFirst({ where: { email } });
    
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản nào gắn với email này' });
    if (!user.isActive) return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (error: any) {
    console.error('Google login error:', error.message);
    res.status(500).json({ error: 'Xác thực Google thất bại' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtp: otp, resetOtpExpiry: expiry }
    });

    const host = await getSetting('smtp_host') || 'smtp.gmail.com';
    const port = parseInt(await getSetting('smtp_port') || '465');
    const secure = port === 465;
    const userEmail = await getSetting('smtp_user');
    const pass = await getSetting('smtp_app_password');
    const senderName = await getSetting('smtp_sender_name') || 'Hệ Thống';

    if (!userEmail || !pass) {
      return res.status(500).json({ error: 'Hệ thống chưa cấu hình gửi email' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: userEmail, pass }
    });

    const mailOptions = {
      from: `"${senderName}" <${userEmail}>`,
      to: email,
      subject: 'Mã xác thực khôi phục mật khẩu',
      html: `<p>Xin chào ${user.name},</p><p>Mã xác thực (OTP) của bạn là: <b>${otp}</b></p><p>Mã này có hiệu lực trong 10 phút.</p>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Đã gửi mã OTP tới email của bạn' });

  } catch (error: any) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ error: 'Có lỗi xảy ra khi gửi email' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || user.resetOtp !== otp || !user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
      return res.status(400).json({ error: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || user.resetOtp !== otp || !user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
      return res.status(400).json({ error: 'Yêu cầu không hợp lệ' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash, resetOtp: null, resetOtpExpiry: null }
    });

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
