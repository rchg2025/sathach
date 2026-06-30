import toast from 'react-hot-toast';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import * as XLSX from 'xlsx';
import { Edit, Trash2 } from 'lucide-react';

const UserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [formData, setFormData] = useState({
    username: '', password: '', role: 'MANAGER', name: '', phone: '', email: ''
  });

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editData, setEditData] = useState({
    name: '', role: '', isActive: true, password: '', phone: '', email: ''
  });

  const [user, setUser] = useState<any>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/users`);
      setUsers(res.data);
      applyFilters(res.data, searchQuery, filterRole, filterStatus);
    } catch (e) { console.error('Lỗi lấy ds thành viên', e); }
  };

  const applyFilters = (data: any[], search: string, role: string, status: string) => {
    let filtered = data;
    
    // Chỉ ADMIN mới nhìn thấy tài khoản ADMIN
    if (user?.role !== 'ADMIN') {
      filtered = filtered.filter(u => u.role !== 'ADMIN');
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(s) || 
        u.username.toLowerCase().includes(s) ||
        (u.phone && u.phone.includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s))
      );
    }
    if (role !== 'ALL') {
      filtered = filtered.filter(u => u.role === role);
    }
    if (status !== 'ALL') {
      const isActive = status === 'ACTIVE';
      filtered = filtered.filter(u => u.isActive === isActive);
    }
    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    applyFilters(users, searchQuery, filterRole, filterStatus);
  }, [searchQuery, filterRole, filterStatus, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/manager/users`, formData);
      toast.success('Thêm thành viên thành công!');
      setFormData({ username: '', password: '', role: 'MANAGER', name: '', phone: '', email: '' });
      setActiveTab('list');
      fetchUsers();
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Lỗi thêm thành viên');
    }
  };

  const handleEditClick = (u: any) => {
    setEditingUser(u);
    setEditData({
      name: u.name, role: u.role, isActive: u.isActive, password: '', phone: u.phone || '', email: u.email || ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/manager/users/${editingUser.id}`, editData);
      toast.success('Cập nhật thành công!');
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi cập nhật');
    }
  };

  const toggleActive = async (u: any) => {
    if (u.id === user?.id) {
      toast.error('Không thể tự vô hiệu hóa tài khoản của chính mình!');
      return;
    }
    try {
      // Optimistic UI update
      setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, isActive: !usr.isActive } : usr));
      await axios.put(`${API_BASE_URL}/api/manager/users/${u.id}`, { ...u, isActive: !u.isActive });
    } catch (e) {
      toast.error('Lỗi cập nhật trạng thái');
      fetchUsers(); // revert
    }
  };

  const handleDelete = (u: any) => {
    if (u.id === user?.id) {
      toast.error('Không thể tự xóa tài khoản của chính mình!');
      return;
    }
    
    toast((t) => (
      <div>
        <p><b>CẢNH BÁO:</b> Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "{u.username}" không? Hành động này không thể hoàn tác!</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-danger" 
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await axios.delete(`${API_BASE_URL}/api/manager/users/${u.id}`);
                toast.success('Xóa tài khoản thành công!');
                fetchUsers();
              } catch (e) {
                toast.error('Lỗi xóa tài khoản');
              }
            }}
          >
            Xác nhận Xóa
          </button>
          <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={() => toast.dismiss(t.id)}>
            Hủy bỏ
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  // Excel Features
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Họ và Tên": "Nguyễn Văn A", "Tên đăng nhập": "nguyenvana", "Mật khẩu": "123456", "Phân quyền (ADMIN/MANAGER/EXAMINER)": "MANAGER", "Số điện thoại": "0987654321", "Email": "nva@gmail.com" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Sathach_User_Template.xlsx");
  };

  const exportExcel = () => {
    const exportData = filteredUsers.map(u => ({
      "Họ và Tên": u.name,
      "Tên đăng nhập": u.username,
      "Phân quyền": u.role,
      "Trạng thái": u.isActive ? "Đang hoạt động" : "Bị khóa",
      "Số điện thoại": u.phone || "",
      "Email": u.email || "",
      "Ngày tạo": new Date(u.createdAt).toLocaleDateString('vi-VN')
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "DanhSach_ThanhVien.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        let successCount = 0;
        let failCount = 0;
        
        for (const row of data) {
          const payload = {
            name: row["Họ và Tên"],
            username: row["Tên đăng nhập"],
            password: row["Mật khẩu"] ? String(row["Mật khẩu"]) : "123456",
            role: row["Phân quyền (ADMIN/MANAGER/EXAMINER)"] || "MANAGER",
            phone: row["Số điện thoại"] ? String(row["Số điện thoại"]) : "",
            email: row["Email"] || ""
          };
          if (!payload.name || !payload.username) continue;
          
          try {
            await axios.post(`${API_BASE_URL}/api/manager/users`, payload);
            successCount++;
          } catch (err) { failCount++; }
        }
        
        toast('Import hoàn tất!\nThành công: ${successCount}\nThất bại: ${failCount} (Có thể do trùng Tên đăng nhập)', { icon: 'ℹ️' });
        fetchUsers();
      } catch (err) {
        toast.error("File không hợp lệ hoặc lỗi trong quá trình xử lý.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const displayedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout user={user}>
      <div className="container">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ margin: 0 }}>Quản lý Thành viên</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" style={{ background: '#28a745', color: 'white' }} onClick={exportExcel}>Export Excel</button>
            <button className="btn" style={{ background: '#17a2b8', color: 'white' }} onClick={() => fileInputRef.current?.click()}>Import Excel</button>
            <button className="btn" style={{ background: '#6c757d', color: 'white' }} onClick={downloadTemplate}>Tải File Mẫu</button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImport} />
          </div>
        </div>
        
        <div className="tabs">
          <div className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => { setActiveTab('list'); setEditingUser(null); }}>
            Danh sách Thành viên
          </div>
          <div className={`tab ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
            Thêm mới
          </div>
        </div>

        {activeTab === 'list' && !editingUser && (
          <div className="card" style={{ padding: '0' }}>
            {/* Filters */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Tìm kiếm theo Tên, Username, SĐT, Email..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ width: '150px' }}>
                <select className="form-control" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                  <option value="ALL">Tất cả Quyền</option>
                  {user?.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                  <option value="STATION_MANAGER">Trưởng trạm</option>
                  <option value="MANAGER">Quản lý</option>
                  <option value="EXAMINER">Giám khảo</option>
                </select>
              </div>
              <div style={{ width: '150px' }}>
                <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Đã khóa</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
<table className="table" style={{ minWidth: '800px', margin: 0 }}>
                <thead>
                  <tr>
                    <th>Họ và Tên</th>
                    <th>Liên hệ</th>
                    <th>Tên đăng nhập</th>
                    <th>Quyền</th>
                    <th>Trạng thái (Khóa/Mở)</th>
                    <th className="sticky-col-right" style={{ textAlign: 'right' }}>Thao tác</th>
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
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'STATION_MANAGER' ? 'badge-info' : u.role === 'MANAGER' ? 'badge-success' : 'badge-warning'}`}>
                          {u.role === 'STATION_MANAGER' ? 'Trưởng trạm' : u.role === 'ADMIN' ? 'Quản trị' : u.role === 'MANAGER' ? 'Quản lý' : u.role === 'EXAMINER' ? 'Giám khảo' : u.role}
                        </span>
                      </td>
                      <td>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={u.isActive} onChange={() => toggleActive(u)} disabled={u.id === user?.id || (user?.role !== 'ADMIN' && u.role === 'ADMIN')} />
                          <span className="toggle-slider"></span>
                        </label>
                      </td>
                      <td className="sticky-col-right" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" title="Sửa" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleEditClick(u)} disabled={user?.role !== 'ADMIN' && u.role === 'ADMIN'}><Edit size={16} /></button>
                        {user?.role === 'ADMIN' && (
                          <button className="btn btn-danger" title="Xóa" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleDelete(u)} disabled={u.id === user?.id}><Trash2 size={16} /></button>
                        )}
                      </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                        Chưa có dữ liệu thành viên phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
</div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} / {filteredUsers.length}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn" style={{ padding: '0.3rem 0.6rem' }} disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Trước</button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button key={i} className="btn"
                      style={{ padding: '0.3rem 0.6rem', background: currentPage === i + 1 ? 'var(--primary)' : 'transparent', color: currentPage === i + 1 ? '#fff' : 'inherit' }}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button className="btn" style={{ padding: '0.3rem 0.6rem' }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Sau</button>
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
                 <div className="form-group"><label>Họ và Tên</label><input type="text" className="form-control" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} required/></div>
                 <div className="form-group"><label>Mật khẩu mới</label><input type="password" className="form-control" placeholder="Để trống nếu không đổi..." value={editData.password} onChange={e => setEditData({...editData, password: e.target.value})}/></div>
                 <div className="form-group"><label>Số điện thoại</label><input type="tel" className="form-control" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})}/></div>
                 <div className="form-group"><label>Email</label><input type="email" className="form-control" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})}/></div>
                 <div className="form-group">
                   <label>Phân quyền</label>
                   <select className="form-control" value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})} disabled={editingUser.id === user?.id && editingUser.role === 'ADMIN'}>
                      <option value="ADMIN" disabled={user?.role !== 'ADMIN'}>Admin</option><option value="STATION_MANAGER">Trưởng trạm</option><option value="MANAGER">Quản lý</option><option value="EXAMINER">Giám khảo</option>
                   </select>
                 </div>
                 <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '8px', width: '100%' }}>
                     <label className="toggle-switch">
                        <input type="checkbox" checked={editData.isActive} onChange={e => setEditData({...editData, isActive: e.target.checked})} disabled={editingUser.id === user?.id} />
                        <span className="toggle-slider"></span>
                      </label>
                     <label style={{ margin: 0, fontWeight: 500 }}>Tài khoản đang hoạt động</label>
                   </div>
                 </div>
               </div>
               <div style={{ textAlign: 'right', marginTop: '1rem' }}><button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Lưu Thay Đổi</button></div>
             </form>
           </div>
        )}

        {activeTab === 'add' && (
          <div className="card">
            <h3 className="mb-4">Tạo Tài khoản mới</h3>
            <form onSubmit={handleSubmit}>
              <div className="dashboard-grid grid-cols-2">
                <div className="form-group"><label>Họ và Tên *</label><input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required/></div>
                <div className="form-group"><label>Phân quyền *</label>
                  <select className="form-control" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="ADMIN" disabled={user?.role !== 'ADMIN'}>Admin</option><option value="STATION_MANAGER">Trưởng trạm</option><option value="MANAGER">Quản lý</option><option value="EXAMINER">Giám khảo</option>
                  </select>
                </div>
                <div className="form-group"><label>Tên đăng nhập *</label><input type="text" className="form-control" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required/></div>
                <div className="form-group"><label>Mật khẩu *</label><input type="password" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required/></div>
                <div className="form-group"><label>Số điện thoại</label><input type="tel" className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}/></div>
                <div className="form-group"><label>Email</label><input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div>
              </div>
              <div style={{ textAlign: 'right', marginTop: '1rem' }}><button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Tạo tài khoản</button></div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserManager;
