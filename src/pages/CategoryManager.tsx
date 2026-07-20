import { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import CourseManager from './CourseManager';
import VehicleTypeManager from './VehicleTypeManager';
import TestTypeManager from './TestTypeManager';
import ExamManager from './ExamManager';
import CriterionManager from './CriterionManager';
import TrainingTabWrapper from './TrainingTabWrapper';

const CategoryManager = () => {
  const [activeCategory, setActiveCategory] = useState<'courses' | 'vehicles' | 'stations' | 'exams' | 'criteria' | 'training'>('courses');
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
          Quản lý Xe
        </div>
        <div 
          className={`tab ${activeCategory === 'stations' ? 'active' : ''}`}
          onClick={() => setActiveCategory('stations')}
        >
          Trạm thi
        </div>
        <div 
          className={`tab ${activeCategory === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveCategory('exams')}
        >
          Bài thi
        </div>
        <div 
          className={`tab ${activeCategory === 'criteria' ? 'active' : ''}`}
          onClick={() => setActiveCategory('criteria')}
        >
          Tiêu chí
        </div>
        <div 
          className={`tab ${activeCategory === 'training' ? 'active' : ''}`}
          onClick={() => setActiveCategory('training')}
        >
          Quản lý sân và Ca tập lái
        </div>
      </div>

      <div className="category-content">
        {activeCategory === 'courses' && <CourseManager />}
        {activeCategory === 'vehicles' && <VehicleTypeManager />}
        {activeCategory === 'stations' && <TestTypeManager />}
        {activeCategory === 'exams' && <ExamManager />}
        {activeCategory === 'criteria' && <CriterionManager />}
        {activeCategory === 'training' && <TrainingTabWrapper />}
      </div>
    </AdminLayout>
  );
};

export default CategoryManager;
