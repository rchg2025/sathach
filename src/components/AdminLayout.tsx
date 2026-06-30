import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  BookOpen, 
  Settings, 
  LogOut,
  Shield
} from 'lucide-react';

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
          <div className="sidebar-avatar">
            <Shield size={32} />
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
          <Link to="/manager/courses" className={`sidebar-item ${isActive('/manager/courses')}`}>
            <BookOpen size={20} /> Quản lý Khóa học
          </Link>
          <Link to="/manager/test-types" className={`sidebar-item ${isActive('/manager/test-types')}`}>
            <ClipboardList size={20} /> Loại Sát hạch
          </Link>
          <a className="sidebar-item">
            <Users size={20} /> Quản lý Học viên
          </a>
          <a className="sidebar-item">
            <Users size={20} /> Phân công Giám khảo
          </a>
          {user?.role === 'ADMIN' && (
            <Link to="/manager/users" className={`sidebar-item ${isActive('/manager/users')}`}>
              <Shield size={20} /> Quản lý Thành viên
            </Link>
          )}
          <a className="sidebar-item">
            <Settings size={20} /> Cấu hình hệ thống
          </a>
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
