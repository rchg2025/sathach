import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  LogOut,
  Shield,
  UserCircle,
  Car,
  Menu,
  X
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: any;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Hệ thống Quản lý</h3>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px' }} className="d-md-none">
            {isSidebarOpen && (
              <X size={24} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={closeSidebar} />
            )}
          </div>
          <div className="sidebar-avatar" style={{ overflow: 'hidden' }}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl.startsWith('/') ? API_BASE_URL + user.avatarUrl : user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Shield size={32} />
            )}
          </div>
          <h4 style={{ margin: 0 }}>{user?.name || 'Nguyễn Văn Luyện'}</h4>
          <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            {user?.role === 'ADMIN' ? 'Quản trị hệ thống' : user?.role === 'MANAGER' ? 'Quản lý hệ thống' : user?.role === 'STATION_MANAGER' ? 'Trưởng trạm' : 'Giám khảo'}
            <LogOut size={14} style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={handleLogout} />
          </p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/manager" className={`sidebar-item ${isActive('/manager')}`} onClick={closeSidebar}>
            <LayoutDashboard size={20} /> Bảng điều khiển
          </Link>
          {(user?.role === 'STATION_MANAGER' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Link to="/manager/testing" className={`sidebar-item ${isActive('/manager/testing')}`} onClick={closeSidebar}>
              <Car size={20} /> Sát hạch
            </Link>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <>
              <Link to="/manager/categories" className={`sidebar-item ${isActive('/manager/categories')}`} onClick={closeSidebar}>
                <BookOpen size={20} /> Quản lý Danh mục
              </Link>
              <Link to="/manager/students" className={`sidebar-item ${isActive('/manager/students')}`} onClick={closeSidebar}>
                <Users size={20} /> Quản lý Học viên
              </Link>
              <Link to="/manager/assignments" className={`sidebar-item ${isActive('/manager/assignments')}`} onClick={closeSidebar}>
                <Users size={20} /> Phân công Giám khảo
              </Link>
              <Link to="/manager/users" className={`sidebar-item ${isActive('/manager/users')}`} onClick={closeSidebar}>
                <Shield size={20} /> Quản lý Thành viên
              </Link>
            </>
          )}
          <Link to="/profile" className={`sidebar-item ${isActive('/profile')}`} onClick={closeSidebar}>
            <UserCircle size={20} /> Hồ sơ cá nhân
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/manager/settings" className={`sidebar-item ${isActive('/manager/settings')}`} onClick={closeSidebar}>
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
