import { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import CourseManager from './CourseManager';
import VehicleTypeManager from './VehicleTypeManager';
import TestTypeManager from './TestTypeManager';

const CategoryManager = () => {
  const [activeCategory, setActiveCategory] = useState<'courses' | 'vehicles' | 'tests'>('courses');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <AdminLayout user={user}>
      <h2 className="mb-4">Quản lý Danh mục</h2>
      <div className="tabs mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div 
          className={`tab ${activeCategory === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveCategory('courses')}
        >
          Khóa học
        </div>
        <div 
          className={`tab ${activeCategory === 'vehicles' ? 'active' : ''}`}
          onClick={() => setActiveCategory('vehicles')}
        >
          Loại xe
        </div>
        <div 
          className={`tab ${activeCategory === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveCategory('tests')}
        >
          Bài thi (Sát hạch)
        </div>
      </div>

      <div className="category-content">
        {activeCategory === 'courses' && <CourseManager />}
        {activeCategory === 'vehicles' && <VehicleTypeManager />}
        {activeCategory === 'tests' && <TestTypeManager />}
      </div>
    </AdminLayout>
  );
};

export default CategoryManager;
