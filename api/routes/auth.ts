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
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { username: username },
          { email: username }
        ]
      } 
    });
    if (!user) return res.status(401).json({ error: 'Tên đăng nhập, email hoặc mật khẩu không đúng' });
    if (!user.isActive) return res.status(403).json({ error: 'Tài khoản bạn đang bị khóa vui lòng liên hệ quản trị viên để được hướng dẫn.' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Tên đăng nhập, email hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    // Update online status and log
    await prisma.user.update({ where: { id: user.id }, data: { isOnline: true } });
    await prisma.systemLog.create({ data: { userId: user.id, action: 'LOGIN' } });

    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone, email: user.email, avatarUrl: user.avatarUrl, isOnline: true } });
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
    if (!user.isActive) return res.status(403).json({ error: 'Tài khoản bạn đang bị khóa vui lòng liên hệ quản trị viên để được hướng dẫn.' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    // Update online status and log
    await prisma.user.update({ where: { id: user.id }, data: { isOnline: true } });
    await prisma.systemLog.create({ data: { userId: user.id, action: 'LOGIN' } });

    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone, email: user.email, avatarUrl: user.avatarUrl, isOnline: true } });
  } catch (error: any) {
    console.error('Google login error:', error.message);
    res.status(500).json({ error: 'Xác thực Google thất bại' });
  }
});

router.post('/logout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { isOnline: false } });
      await prisma.systemLog.create({ data: { userId: user.id, action: 'LOGOUT' } });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/ping', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  try {
    await prisma.user.update({
      where: { id: Number(userId) },
      data: { lastPingAt: new Date(), isOnline: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
      subject: 'Mã xác thực khôi phục mật khẩu - Hệ Thống Sát Hạch',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background-color: #1a73e8; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Hệ Thống Quản Lý Sát Hạch</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Yêu cầu khôi phục mật khẩu</p>
          </div>
          
          <div style="padding: 30px 20px; text-align: center;">
            <p style="color: #555; line-height: 1.5; font-size: 16px; margin-bottom: 20px;">Xin chào <strong>${user.name}</strong>,</p>
            <p style="color: #555; line-height: 1.5; font-size: 16px; margin-bottom: 30px;">Hệ thống vừa nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác thực dưới đây:</p>
            
            <div style="background-color: #f4f8ff; border: 2px dashed #1a73e8; border-radius: 8px; padding: 20px; display: inline-block; margin: 0 auto;">
              <span style="font-size: 32px; font-weight: bold; color: #1a73e8; letter-spacing: 5px;">${otp}</span>
            </div>
            
            <p style="color: #d32f2f; margin-top: 30px; font-size: 14px;"><em>* Lưu ý: Mã xác thực này chỉ có hiệu lực trong vòng 10 phút. Không chia sẻ mã này cho bất kỳ ai.</em></p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee;">
            <p style="margin: 0;">Email này được gửi tự động từ Hệ Thống Quản Lý Sát Hạch.</p>
            <p style="margin: 5px 0 0 0;">Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
        </div>
      `
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
