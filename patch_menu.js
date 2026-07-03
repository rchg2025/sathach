const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, 'src', 'components', 'AdminLayout.tsx');
let content = fs.readFileSync(layoutPath, 'utf-8');
content = content.replace(/\r\n/g, '\n');

// Import History for Nhật ký, Calendar for Tổ chức thi lại, Upload for Nhập điểm
if (!content.includes('Calendar')) {
  content = content.replace(
    `import { \n  LayoutDashboard, \n  Users, \n  BookOpen, \n  Settings, \n  LogOut,\n  Shield,\n  UserCircle,\n  Car,\n  Menu,\n  X,\n  ChevronLeft,\n  ChevronRight,\n  CheckCircle,\n  FileText\n} from 'lucide-react';`,
    `import { \n  LayoutDashboard, \n  Users, \n  BookOpen, \n  Settings, \n  LogOut,\n  Shield,\n  UserCircle,\n  Car,\n  Menu,\n  X,\n  ChevronLeft,\n  ChevronRight,\n  CheckCircle,\n  FileText,\n  Calendar,\n  History,\n  Upload\n} from 'lucide-react';`
  );
}

// Extract nav content and replace
const newNav = `<nav className="sidebar-nav">
          <Link to="/manager" className={\`sidebar-item \${isActive('/manager')}\`} onClick={closeSidebar}>
            <LayoutDashboard size={20} /> <span className="sidebar-item-text">Bảng điều khiển</span>
          </Link>
          
          {((user?.role === 'STATION_MANAGER' || user?.username === 'quantri') || (user?.role === 'ADMIN' || user?.username === 'quantri') || (user?.role === 'MANAGER' || user?.username === 'quantri') || (user?.role === 'EXAMINER' || user?.username === 'quantri')) && (
            <Link to="/manager/testing" className={\`sidebar-item \${isActive('/manager/testing')}\`} onClick={closeSidebar}>
              <Car size={20} /> <span className="sidebar-item-text">Danh sách sát hạch</span>
            </Link>
          )}
          
          {(user?.role === 'EXAMINER' || user?.username === 'quantri') && (
            <Link to="/examiner" className={\`sidebar-item \${isActive('/examiner')}\`} onClick={closeSidebar}>
              <CheckCircle size={20} /> <span className="sidebar-item-text">Chấm thi</span>
            </Link>
          )}
          
          <hr style={{ margin: '0.5rem 1rem', borderColor: 'var(--border)' }} />
          
          {((user?.role === 'ADMIN' || user?.username === 'quantri') || (user?.role === 'MANAGER' || user?.username === 'quantri')) && (
            <>
              <Link to="/manager/categories" className={\`sidebar-item \${isActive('/manager/categories')}\`} onClick={closeSidebar}>
                <BookOpen size={20} /> <span className="sidebar-item-text">Quản lý Danh mục</span>
              </Link>
              <Link to="/manager/students" className={\`sidebar-item \${isActive('/manager/students')}\`} onClick={closeSidebar}>
                <Users size={20} /> <span className="sidebar-item-text">Quản lý học viên</span>
              </Link>
              <Link to="/manager/retakes" className={\`sidebar-item \${isActive('/manager/retakes')}\`} onClick={closeSidebar}>
                <Calendar size={20} /> <span className="sidebar-item-text">Tổ chức thi lại</span>
              </Link>
              <Link to="/manager/assignments" className={\`sidebar-item \${isActive('/manager/assignments')}\`} onClick={closeSidebar}>
                <Users size={20} /> <span className="sidebar-item-text">Phân công</span>
              </Link>
              <Link to="/manager/users" className={\`sidebar-item \${isActive('/manager/users')}\`} onClick={closeSidebar}>
                <Shield size={20} /> <span className="sidebar-item-text">Quản lý Thành viên</span>
              </Link>
              <Link to="/manager/import-scores" className={\`sidebar-item \${isActive('/manager/import-scores')}\`} onClick={closeSidebar}>
                <Upload size={20} /> <span className="sidebar-item-text">Nhập điểm</span>
              </Link>
              <Link to="/manager/reports" className={\`sidebar-item \${isActive('/manager/reports')}\`} onClick={closeSidebar}>
                <FileText size={20} /> <span className="sidebar-item-text">Báo cáo - Thống kê</span>
              </Link>
            </>
          )}

          <hr style={{ margin: '0.5rem 1rem', borderColor: 'var(--border)' }} />
          
          {((user?.role === 'STATION_MANAGER' || user?.username === 'quantri') || (user?.role === 'ADMIN' || user?.username === 'quantri') || (user?.role === 'MANAGER' || user?.username === 'quantri')) && (
            <Link to="/manager/system-logs" className={\`sidebar-item \${isActive('/manager/system-logs')}\`} onClick={closeSidebar}>
              <History size={20} /> <span className="sidebar-item-text">Nhật ký</span>
            </Link>
          )}
          
          {(user?.role === 'ADMIN' || user?.username === 'quantri') && (
            <Link to="/manager/settings" className={\`sidebar-item \${isActive('/manager/settings')}\`} onClick={closeSidebar}>
              <Settings size={20} /> <span className="sidebar-item-text">Cấu hình hệ thống</span>
            </Link>
          )}
          
          <Link to="/profile" className={\`sidebar-item \${isActive('/profile')}\`} onClick={closeSidebar}>
            <UserCircle size={20} /> <span className="sidebar-item-text">Hồ sơ cá nhân</span>
          </Link>
          
        </nav>`;

content = content.replace(/<nav className="sidebar-nav">[\s\S]*?<\/nav>/, newNav);

fs.writeFileSync(layoutPath, content, 'utf-8');
console.log('Patched AdminLayout.tsx menu items successfully.');
