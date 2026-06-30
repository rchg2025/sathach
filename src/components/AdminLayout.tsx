import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  LogOut,
  Shield,
  UserCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: any;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-avatar" style={{ overflow: 'hidden' }}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl.startsWith('/') ? API_BASE_URL + user.avatarUrl : user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Shield size={32} />
            )}
          </div>
          <h4 style={{ margin: 0 }}>{user?.name || 'Nguyễn Văn Luyện'}</h4>
          <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            {user?.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Quản lý hệ thống'}
            <LogOut size={14} style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={handleLogout} />
          </p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/manager" className={`sidebar-item ${isActive('/manager')}`}>
            <LayoutDashboard size={20} /> Bảng điều khiển
          </Link>
          <Link to="/manager/categories" className={`sidebar-item ${isActive('/manager/categories')}`}>
            <BookOpen size={20} /> Quản lý Danh mục
          </Link>
          <Link to="/manager/students" className={`sidebar-item ${isActive('/manager/students')}`}>
            <Users size={20} /> Quản lý Học viên
          </Link>
          <Link to="/manager/assignments" className={`sidebar-item ${isActive('/manager/assignments')}`}>
            <Users size={20} /> Phân công Giám khảo
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/manager/users" className={`sidebar-item ${isActive('/manager/users')}`}>
              <Shield size={20} /> Quản lý Thành viên
            </Link>
          )}
          <Link to="/profile" className={`sidebar-item ${isActive('/profile')}`}>
            <UserCircle size={20} /> Hồ sơ cá nhân
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/manager/settings" className={`sidebar-item ${isActive('/manager/settings')}`}>
              <Settings size={20} /> Cấu hình hệ thống
            </Link>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
