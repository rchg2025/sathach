import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';

const UserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'MANAGER',
    name: ''
  });

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      setUser(JSON.parse(u));
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/users`);
      setUsers(res.data);
    } catch (e) { console.error('Lỗi lấy ds thành viên', e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/manager/users`, formData);
      alert('Thêm thành viên thành công!');
      setFormData({ username: '', password: '', role: 'MANAGER', name: '' });
      setActiveTab('list');
      fetchUsers();
    } catch (e: any) { 
      alert(e.response?.data?.error || 'Lỗi thêm thành viên');
    }
  };

  return (
    <AdminLayout user={user}>
      <div className="container">
        <h2>Quản lý Thành viên</h2>
        
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Danh sách Thành viên
          </div>
          <div 
            className={`tab ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Thêm mới
          </div>
        </div>

        {activeTab === 'list' && (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Họ và Tên</th>
                  <th>Tên đăng nhập</th>
                  <th>Quyền</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'MANAGER' ? 'badge-success' : 'badge-warning'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Họ và Tên</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tên đăng nhập</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phân quyền</label>
                <select 
                  className="form-control"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Quản lý</option>
                  <option value="EXAMINER">Giám khảo</option>
                </select>
              </div>
              
              <button type="submit" className="btn btn-primary">Tạo tài khoản</button>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserManager;
