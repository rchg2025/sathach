import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from './config';
import { Search, UserCircle } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import StudentSearch from './pages/StudentSearch';
import ManagerDashboard from './pages/ManagerDashboard';
import CourseManager from './pages/CourseManager';

import CategoryManager from './pages/CategoryManager';
import UserManager from './pages/UserManager';
import StudentManager from './pages/StudentManager';
import AssignmentManager from './pages/AssignmentManager';
import ExaminerDashboard from './pages/ExaminerDashboard';
import Profile from './pages/Profile';
import SettingsManager from './pages/SettingsManager';
import StationTesting from './pages/StationTesting';
import ResultsManager from './pages/ResultsManager';
import './index.css';

const PublicHeader = () => {
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/manager/settings`)
      .then(res => {
        if (res.data.logo_url) setLogoUrl(res.data.logo_url);
      })
      .catch(console.error);
  }, []);

  if (location.pathname.startsWith('/manager') || location.pathname.startsWith('/examiner') || location.pathname.startsWith('/profile')) return null;
  return (
    <div className="app-header">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain', background: 'white', padding: '2px', borderRadius: '5px' }} />}
          <h1 style={{ margin: 0 }}>Hệ Thống Chấm Thi Thực Hành</h1>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Search size={18} /> Tra cứu Điểm
          </Link>
          <Link to="/login" style={{ color: 'white', display: 'flex', alignItems: 'center' }} title="Đăng nhập Cán bộ">
            <UserCircle size={24} />
          </Link>
        </nav>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <PublicHeader />
      <Routes>
        <Route path="/" element={<div className="container mt-4"><StudentSearch /></div>} />
        <Route path="/login" element={<div className="container mt-4"><Login /></div>} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/categories" element={<CategoryManager />} />
        {/* Kept for backward compatibility if needed, though they aren't in sidebar anymore */}
        <Route path="/manager/courses" element={<CourseManager />} />
        <Route path="/manager/students" element={<StudentManager />} />
        <Route path="/manager/assignments" element={<AssignmentManager />} />
        <Route path="/manager/users" element={<UserManager />} />
        <Route path="/manager/settings" element={<SettingsManager />} />
        <Route path="/manager/testing" element={<StationTesting />} />
        <Route path="/manager/results" element={<ResultsManager />} />
        <Route path="/examiner" element={<ExaminerDashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
