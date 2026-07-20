import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Search, UserCircle } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
const Login = lazy(() => import('./pages/Login'));
const StudentSearch = lazy(() => import('./pages/StudentSearch'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const CourseManager = lazy(() => import('./pages/CourseManager'));
const CategoryManager = lazy(() => import('./pages/CategoryManager'));
const UserManager = lazy(() => import('./pages/UserManager'));
const StudentManager = lazy(() => import('./pages/StudentManager'));
const AssignmentManager = lazy(() => import('./pages/AssignmentManager'));
const ExaminerDashboard = lazy(() => import('./pages/ExaminerDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const SettingsManager = lazy(() => import('./pages/SettingsManager'));
const StationTesting = lazy(() => import('./pages/StationTesting'));
const SystemLogs = lazy(() => import('./pages/SystemLogs'));
const ReportsManager = lazy(() => import('./pages/ReportsManager'));
const StatisticsManager = lazy(() => import('./pages/StatisticsManager'));
const RecordsManager = lazy(() => import('./pages/RecordsManager'));
const ScoreImport = lazy(() => import('./pages/ScoreImport'));
const RetakeManager = lazy(() => import('./pages/RetakeManager'));
const TrainingSessionManager = lazy(() => import('./pages/TrainingSessionManager'));
const TrainingRegistration = lazy(() => import('./pages/TrainingRegistration'));

import './index.css';



import { fetchSettingsCached } from './utils/apiCache';

const PublicHeader = () => {
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    fetchSettingsCached()
      .then(settings => {
        if (settings.logo_url) setLogoUrl(settings.logo_url);
      })
      .catch(console.error);
  }, []);

  if (location.pathname.startsWith('/manager') || location.pathname.startsWith('/examiner') || location.pathname.startsWith('/profile') || location.pathname.startsWith('/training-registration')) return null;
  return (
    <div className="app-header">
      <div className="container">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {logoUrl && <img src={logoUrl} alt="Logo" width="40" height="40" style={{ height: '40px', width: 'auto', objectFit: 'contain', background: 'white', padding: '2px', borderRadius: '5px' }} />}
            <h1 style={{ margin: 0 }}>Hệ Thống Chấm Thi Thực Hành</h1>
          </div>
        </Link>
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

const GlobalSEOUpdater = () => {
  useEffect(() => {
    fetchSettingsCached()
      .then(settings => {
        if (settings.seo_title) {
          document.title = settings.seo_title;
          document.querySelector('meta[property="og:title"]')?.setAttribute('content', settings.seo_title);
        }
        if (settings.seo_description) {
          document.querySelector('meta[name="description"]')?.setAttribute('content', settings.seo_description);
          document.querySelector('meta[property="og:description"]')?.setAttribute('content', settings.seo_description);
        }
        if (settings.logo_url) {
          document.querySelector('meta[property="og:image"]')?.setAttribute('content', settings.logo_url);
          document.querySelector('link[rel="icon"]')?.setAttribute('href', settings.logo_url);
        }
      })
      .catch(console.error);
  }, []);
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <GlobalSEOUpdater />
      <Toaster position="top-right" />
      <PublicHeader />
      <Suspense fallback={<div className="container mt-4" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</div>}>
        <Routes>
          <Route path="/" element={<StudentSearch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/categories" element={<CategoryManager />} />
          {/* Kept for backward compatibility if needed, though they aren't in sidebar anymore */}
          <Route path="/manager/courses" element={<CourseManager />} />
          <Route path="/manager/students" element={<StudentManager />} />
          <Route path="/manager/assignments" element={<AssignmentManager />} />
          <Route path="/manager/training-sessions" element={<TrainingSessionManager />} />
          <Route path="/training-registration" element={<TrainingRegistration />} />
          <Route path="/manager/retakes" element={<RetakeManager />} />
          <Route path="/manager/users" element={<UserManager />} />
          <Route path="/manager/settings" element={<SettingsManager />} />
          <Route path="/manager/testing" element={<StationTesting />} />
          <Route path="/manager/system-logs" element={<SystemLogs />} />
          <Route path="/manager/reports" element={<ReportsManager />} />
          <Route path="/manager/statistics" element={<StatisticsManager />} />
          <Route path="/manager/records" element={<RecordsManager />} />
          <Route path="/manager/import-scores" element={<ScoreImport />} />
          <Route path="/examiner" element={<ExaminerDashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
