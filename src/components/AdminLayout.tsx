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
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <h3 style={{ margin: 0, fontSize: '1.25rem', cursor: 'pointer' }} onClick={() => window.location.reload()}>Hệ thống Quản lý</h3>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px' }} className="d-md-none">
            {isSidebarOpen && (
              <X size={24} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={closeSidebar} />
            )}
          </div>
          <button className="sidebar-toggle-btn d-none d-md-flex" onClick={toggleCollapse} style={{ position: 'absolute', right: '-15px', top: '50%', transform: 'translateY(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', padding: '4px', zIndex: 10 }}>
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          
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
            <LayoutDashboard size={20} /> <span className="sidebar-item-text">Bảng điều khiển</span>
          </Link>
          {(user?.role === 'STATION_MANAGER' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Link to="/manager/testing" className={`sidebar-item ${isActive('/manager/testing')}`} onClick={closeSidebar}>
              <Car size={20} /> <span className="sidebar-item-text">Sát hạch</span>
            </Link>
          )}
          {user?.role === 'EXAMINER' && (
            <Link to="/examiner" className={`sidebar-item ${isActive('/examiner')}`} onClick={closeSidebar}>
              <Car size={20} /> <span className="sidebar-item-text">Sát hạch</span>
            </Link>
          )}
          <Link to="/manager/results" className={`sidebar-item ${isActive('/manager/results')}`} onClick={closeSidebar}>
            <CheckCircle size={20} /> <span className="sidebar-item-text">Kết quả</span>
          </Link>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <>
              <Link to="/manager/categories" className={`sidebar-item ${isActive('/manager/categories')}`} onClick={closeSidebar}>
                <BookOpen size={20} /> <span className="sidebar-item-text">Quản lý Danh mục</span>
              </Link>
              <Link to="/manager/students" className={`sidebar-item ${isActive('/manager/students')}`} onClick={closeSidebar}>
                <Users size={20} /> <span className="sidebar-item-text">Quản lý Học viên</span>
              </Link>
              <Link to="/manager/assignments" className={`sidebar-item ${isActive('/manager/assignments')}`} onClick={closeSidebar}>
                <Users size={20} /> <span className="sidebar-item-text">Phân công Giám khảo</span>
              </Link>
              <Link to="/manager/users" className={`sidebar-item ${isActive('/manager/users')}`} onClick={closeSidebar}>
                <Shield size={20} /> <span className="sidebar-item-text">Quản lý Thành viên</span>
              </Link>
            </>
          )}
          <Link to="/profile" className={`sidebar-item ${isActive('/profile')}`} onClick={closeSidebar}>
            <UserCircle size={20} /> <span className="sidebar-item-text">Hồ sơ cá nhân</span>
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/manager/settings" className={`sidebar-item ${isActive('/manager/settings')}`} onClick={closeSidebar}>
              <Settings size={20} /> <span className="sidebar-item-text">Cấu hình hệ thống</span>
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
