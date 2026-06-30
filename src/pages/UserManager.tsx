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

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editData, setEditData] = useState({
    name: '',
    role: '',
    isActive: true,
    password: ''
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

  const handleEditClick = (u: any) => {
    setEditingUser(u);
    setEditData({
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      password: '' // Optional for edit
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/manager/users/${editingUser.id}`, editData);
      alert('Cập nhật thành công!');
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Lỗi cập nhật');
    }
  };

  const toggleActive = async (u: any) => {
    try {
      if (u.id === user?.id) {
        alert('Không thể tự vô hiệu hóa tài khoản của chính mình!');
        return;
      }
      if (!confirm(`Bạn có chắc muốn ${u.isActive ? 'vô hiệu hóa' : 'kích hoạt'} tài khoản này?`)) return;
      await axios.put(`${API_BASE_URL}/api/manager/users/${u.id}`, { ...u, isActive: !u.isActive });
      fetchUsers();
    } catch (e) {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  return (
    <AdminLayout user={user}>
      <div className="container">
        <h2>Quản lý Thành viên</h2>
        
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => { setActiveTab('list'); setEditingUser(null); }}
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

        {activeTab === 'list' && !editingUser && (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Họ và Tên</th>
                  <th>Tên đăng nhập</th>
                  <th>Quyền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                    <td>{u.name}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'MANAGER' ? 'badge-success' : 'badge-warning'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.isActive ? (
                        <span className="text-success">Đang hoạt động</span>
                      ) : (
                        <span className="text-danger">Đã khóa</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', marginRight: '5px' }} onClick={() => handleEditClick(u)}>Sửa</button>
                      <button 
                        className={`btn ${u.isActive ? 'btn-danger' : 'btn-primary'}`} 
                        style={{ padding: '0.2rem 0.5rem' }} 
                        onClick={() => toggleActive(u)}
                        disabled={u.id === user?.id}
                      >
                        {u.isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingUser && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>Sửa thông tin: {editingUser.username}</h3>
              <button className="btn" style={{ backgroundColor: '#ccc' }} onClick={() => setEditingUser(null)}>Hủy</button>
            </div>
            
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Họ và Tên</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu mới (Để trống nếu không đổi)</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={editData.password}
                  onChange={e => setEditData({...editData, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Phân quyền</label>
                <select 
                  className="form-control"
                  value={editData.role}
                  onChange={e => setEditData({...editData, role: e.target.value})}
                  disabled={editingUser.id === user?.id && editingUser.role === 'ADMIN'}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Quản lý</option>
                  <option value="EXAMINER">Giám khảo</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={editData.isActive}
                  onChange={e => setEditData({...editData, isActive: e.target.checked})}
                  disabled={editingUser.id === user?.id}
                />
                <label htmlFor="isActive" style={{ margin: 0 }}>Tài khoản đang hoạt động</label>
              </div>
              
              <button type="submit" className="btn btn-primary">Lưu Thay Đổi</button>
            </form>
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
