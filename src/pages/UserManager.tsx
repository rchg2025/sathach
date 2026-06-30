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
    name: '',
    phone: '',
    email: ''
  });

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editData, setEditData] = useState({
    name: '',
    role: '',
    isActive: true,
    password: '',
    phone: '',
    email: ''
  });

  const [user, setUser] = useState<any>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
      setFormData({ username: '', password: '', role: 'MANAGER', name: '', phone: '', email: '' });
      setActiveTab('list');
      setCurrentPage(1);
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
      password: '',
      phone: u.phone || '',
      email: u.email || ''
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

  // Pagination Logic
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const displayedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout user={user}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Quản lý Thành viên</h2>
        
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
          <div className="card" style={{ padding: '0' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: '800px', margin: 0 }}>
                <thead>
                  <tr>
                    <th>Họ và Tên</th>
                    <th>Liên hệ</th>
                    <th>Tên đăng nhập</th>
                    <th>Quyền</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map(u => (
                    <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.6 }}>
                      <td><strong>{u.name}</strong></td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div>{u.phone || <span className="text-muted">Chưa có SĐT</span>}</div>
                          <div>{u.email || <span className="text-muted">Chưa có Email</span>}</div>
                        </div>
                      </td>
                      <td>{u.username}</td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'MANAGER' ? 'badge-success' : 'badge-warning'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.isActive ? (
                          <span className="text-success" style={{ fontWeight: '500' }}>● Hoạt động</span>
                        ) : (
                          <span className="text-danger" style={{ fontWeight: '500' }}>● Đã khóa</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
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
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                        Chưa có dữ liệu thành viên.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, users.length)} / {users.length} thành viên
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    className="btn" 
                    style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Trang trước
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button 
                      key={i}
                      className="btn"
                      style={{ 
                        padding: '0.3rem 0.6rem', 
                        background: currentPage === i + 1 ? 'var(--primary)' : 'var(--bg-secondary)', 
                        color: currentPage === i + 1 ? '#fff' : 'inherit',
                        border: '1px solid var(--border)' 
                      }}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    className="btn" 
                    style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {editingUser && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>Sửa thông tin: <span style={{ color: 'var(--primary)' }}>{editingUser.username}</span></h3>
              <button className="btn" style={{ backgroundColor: '#ccc' }} onClick={() => setEditingUser(null)}>Hủy bỏ</button>
            </div>
            
            <form onSubmit={handleUpdate}>
              <div className="dashboard-grid grid-cols-2">
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
                  <label>Mật khẩu mới</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Để trống nếu không đổi..."
                    value={editData.password}
                    onChange={e => setEditData({...editData, password: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={editData.phone}
                    onChange={e => setEditData({...editData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={editData.email}
                    onChange={e => setEditData({...editData, email: e.target.value})}
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
                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '8px', width: '100%' }}>
                    <input 
                      type="checkbox" 
                      id="isActive"
                      checked={editData.isActive}
                      onChange={e => setEditData({...editData, isActive: e.target.checked})}
                      disabled={editingUser.id === user?.id}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <label htmlFor="isActive" style={{ margin: 0, fontWeight: 500 }}>Tài khoản đang hoạt động</label>
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Lưu Thay Đổi</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="card">
            <h3 className="mb-4">Tạo Tài khoản mới</h3>
            <form onSubmit={handleSubmit}>
              <div className="dashboard-grid grid-cols-2">
                <div className="form-group">
                  <label>Họ và Tên *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phân quyền *</label>
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
                <div className="form-group">
                  <label>Tên đăng nhập *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu *</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              
              <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Tạo tài khoản</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserManager;
