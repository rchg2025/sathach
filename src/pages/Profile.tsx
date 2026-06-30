import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      setFormData({
        name: parsed.name || '',
        phone: parsed.phone || '',
        email: parsed.email || '',
        password: ''
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const payload: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      
      const res = await axios.put(`${API_BASE_URL}/api/manager/users/${user.id}`, payload);
      toast.success('Cập nhật hồ sơ cá nhân thành công!');
      
      // Update local storage
      const updatedUser = { ...user, ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Clear password field
      setFormData(prev => ({ ...prev, password: '' }));
      
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi cập nhật hồ sơ');
    }
  };

  if (!user) return <AdminLayout user={null}><div>Đang tải...</div></AdminLayout>;

  return (
    <AdminLayout user={user}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card">
          <h2 className="mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            Hồ sơ Cá nhân
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="dashboard-grid grid-cols-2">
              <div className="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" className="form-control" value={user.username} disabled style={{ backgroundColor: '#e9ecef' }} />
              </div>
              <div className="form-group">
                <label>Vai trò</label>
                <input type="text" className="form-control" value={user.role} disabled style={{ backgroundColor: '#e9ecef' }} />
              </div>
              <div className="form-group">
                <label>Họ và Tên</label>
                <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Số điện thoại</label>
                <input type="tel" className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input type="password" className="form-control" placeholder="Bỏ trống nếu không đổi..." value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Profile;
