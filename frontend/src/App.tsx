import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import StudentSearch from './pages/StudentSearch';
import ManagerDashboard from './pages/ManagerDashboard';
import CourseManager from './pages/CourseManager';
import TestTypeManager from './pages/TestTypeManager';
import ExaminerDashboard from './pages/ExaminerDashboard';
import './index.css';

const PublicHeader = () => {
  const location = useLocation();
  if (location.pathname === '/manager' || location.pathname === '/examiner') return null;
  return (
    <div className="app-header">
      <div className="container">
        <h1>Hệ Thống Sát Hạch Lái Xe</h1>
        <nav>
          <Link to="/" style={{ color: 'white', marginRight: '1rem' }}>Tra cứu Điểm</Link>
          <Link to="/login" style={{ color: 'white' }}>Đăng nhập Cán bộ</Link>
        </nav>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <PublicHeader />
      <Routes>
        <Route path="/" element={<div className="container mt-4"><StudentSearch /></div>} />
        <Route path="/login" element={<div className="container mt-4"><Login /></div>} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/courses" element={<CourseManager />} />
        <Route path="/manager/test-types" element={<TestTypeManager />} />
        <Route path="/examiner" element={<ExaminerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
