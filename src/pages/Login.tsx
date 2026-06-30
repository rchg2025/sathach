import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      if (res.data.user.role === 'ADMIN' || res.data.user.role === 'MANAGER' || res.data.user.role === 'STATION_MANAGER') {
        navigate('/manager');
      } else {
        navigate('/examiner');
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        const errMsg = err.response.data.error;
        setError(typeof errMsg === 'string' ? errMsg : 'Lỗi kết nối máy chủ (500)');
      } else {
        setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
      }
    } finally { };
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div className="card">
        <h2 className="text-center mb-4">Đăng Nhập Hệ Thống</h2>
        {error && <div className="badge badge-danger mb-4" style={{ display: 'block', textAlign: 'center', padding: '0.5rem' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Tên đăng nhập</label>
            <input 
              type="text" 
              className="form-control" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Đăng Nhập</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
