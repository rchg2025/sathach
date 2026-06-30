import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import StudentSearch from './pages/StudentSearch';
import ManagerDashboard from './pages/ManagerDashboard';
import ExaminerDashboard from './pages/ExaminerDashboard';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-header">
        <div className="container">
          <h1>Hệ Thống Sát Hạch Lái Xe</h1>
          <nav>
            <Link to="/" style={{ color: 'white', marginRight: '1rem' }}>Tra cứu Điểm</Link>
            <Link to="/login" style={{ color: 'white' }}>Đăng nhập Cán bộ</Link>
          </nav>
        </div>
      </div>
      
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<StudentSearch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/examiner" element={<ExaminerDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
