import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { KeyRound, Mail, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const [clientId, setClientId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [showFpPassword, setShowFpPassword] = useState(false);
  const [isFpLoading, setIsFpLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch settings for Google Client ID and Logo
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/manager/settings`);
        if (res.data.google_client_id) setClientId(res.data.google_client_id);
        if (res.data.logo_url) setLogoUrl(res.data.logo_url);
      } catch (e) {
        console.error('Cannot fetch settings', e);
      }
    };
    fetchSettings();
  }, []);

  const handleLoginSuccess = (user: any, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    if (user.role === 'EXAMINER') {
      navigate('/examiner');
    } else {
      navigate('/manager');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { username, password });
      handleLoginSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/google-login`, {
        credential: credentialResponse.credential
      });
      handleLoginSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Đăng nhập Google thất bại');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail) return toast.error('Vui lòng nhập email');
    setIsFpLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email: fpEmail });
      toast.success('Mã OTP đã được gửi tới email của bạn');
      setForgotStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi gửi email');
    } finally {
      setIsFpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpOtp) return toast.error('Vui lòng nhập mã OTP');
    setIsFpLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, { email: fpEmail, otp: fpOtp });
      toast.success('Xác thực thành công');
      setForgotStep(3);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Mã OTP không hợp lệ');
    } finally {
      setIsFpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpNewPassword) return toast.error('Vui lòng nhập mật khẩu mới');
    setIsFpLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/reset-password`, { email: fpEmail, otp: fpOtp, newPassword: fpNewPassword });
      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setShowForgotModal(false);
      setForgotStep(1);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi đổi mật khẩu');
    } finally {
      setIsFpLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 64px)', // Adjust for header height
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem 1rem',
      backgroundImage: `url('https://drive.google.com/uc?export=view&id=1cBozJO0fofk1lclCQTOcJ1wTykCHDqtn')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
        
        {logoUrl && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src={logoUrl} alt="Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
          </div>
        )}
        
        <h2 className="text-center mb-4" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Đăng Nhập Hệ Thống</h2>
        
        {error && <div className="badge badge-danger mb-4" style={{ display: 'block', textAlign: 'center', padding: '0.75rem', fontSize: '0.9rem' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Tên đăng nhập</label>
            <input 
              type="text" 
              className="form-control" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              style={{ padding: '0.75rem' }}
            />
          </div>
          <div className="form-group mb-2" style={{ position: 'relative' }}>
            <label>Mật khẩu</label>
            <input 
              type={showPassword ? "text" : "password"} 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              style={{ padding: '0.75rem', paddingRight: '2.5rem' }}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', top: '38px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <span style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => { setShowForgotModal(true); setForgotStep(1); }}>
              Quên mật khẩu?
            </span>
          </div>

          <button type="submit" className="btn btn-primary btn-block mb-3" style={{ padding: '0.75rem', fontWeight: 'bold', fontSize: '1rem' }}>
            Đăng Nhập
          </button>
        </form>

        {clientId && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Hoặc đăng nhập bằng</p>
            <GoogleOAuthProvider clientId={clientId}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Lỗi khi kết nối với Google')}
                  useOneTap
                  theme="outline"
                  shape="pill"
                />
              </div>
            </GoogleOAuthProvider>
          </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            background: 'white', padding: '2rem', borderRadius: '15px',
            width: '100%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h4 className="mb-4 text-center" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Quên Mật Khẩu</h4>
            
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp}>
                <p className="text-muted text-center mb-4" style={{ fontSize: '0.9rem' }}>Vui lòng nhập địa chỉ email đã đăng ký để nhận mã xác thực.</p>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 10px' }}>
                    <Mail size={18} color="var(--text-light)" />
                    <input type="email" className="form-control" style={{ border: 'none', background: 'transparent' }} placeholder="Nhập email..." value={fpEmail} onChange={e => setFpEmail(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-light" style={{ flex: 1 }} onClick={() => setShowForgotModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isFpLoading}>
                    {isFpLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <p className="text-muted text-center mb-4" style={{ fontSize: '0.9rem' }}>Mã OTP gồm 6 chữ số đã được gửi tới email <b>{fpEmail}</b></p>
                <div className="form-group">
                  <input type="text" className="form-control text-center" style={{ fontSize: '1.5rem', letterSpacing: '5px', padding: '10px' }} placeholder="------" maxLength={6} value={fpOtp} onChange={e => setFpOtp(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-light" style={{ flex: 1 }} onClick={() => setForgotStep(1)}>Quay lại</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isFpLoading}>
                    {isFpLoading ? 'Đang xử lý...' : 'Xác thực'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword}>
                <p className="text-muted text-center mb-4" style={{ fontSize: '0.9rem' }}>Xác thực thành công. Vui lòng tạo mật khẩu mới.</p>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 10px', position: 'relative' }}>
                    <KeyRound size={18} color="var(--text-light)" />
                    <input type={showFpPassword ? "text" : "password"} className="form-control" style={{ border: 'none', background: 'transparent', paddingRight: '2.5rem' }} placeholder="Mật khẩu mới..." value={fpNewPassword} onChange={e => setFpNewPassword(e.target.value)} required minLength={6} />
                    <button 
                      type="button" 
                      onClick={() => setShowFpPassword(!showFpPassword)}
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', alignItems: 'center' }}
                    >
                      {showFpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary btn-block" disabled={isFpLoading}>
                    {isFpLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                  </button>
                </div>
              </form>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
