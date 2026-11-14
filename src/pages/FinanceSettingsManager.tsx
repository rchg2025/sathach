import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { DollarSign, Trash2, Edit3, Save, RefreshCw, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';

const API_BASE_URL = '';

interface Course {
  id: number;
  name: string;
}

interface UserTeacher {
  id: number;
  name: string;
  username: string;
  role: string;
}

interface TuitionFeeConfig {
  id: number;
  courseId: number;
  course: { id: number; name: string };
  transmissionType: string;
  scheduleType: string;
  tuitionAmount: number;
  teacherSharePercent: number;
  teacherShareAmount?: number;
  note?: string;
  _count?: { studentTuitions: number };
}

interface DeductionCategory {
  id: number;
  name: string;
  code?: string;
  description?: string;
  defaultAmount: number;
  isDefault: boolean;
  isActive: boolean;
}

interface AdvancePolicyConfig {
  id?: number;
  maxAdvancePercent: number;
  maxAdvanceTimes: number;
  guidelines?: string;
  isActive: boolean;
}

interface TeacherRateConfig {
  id: number;
  teacherId: number;
  teacher: { id: number; name: string; username: string };
  courseId: number | null;
  course?: { id: number; name: string } | null;
  transmissionType: string | null;
  scheduleType: string | null;
  ratePercent: number;
  note?: string;
}

export default function FinanceSettingsManager() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tuition' | 'teacher_rates' | 'deductions' | 'policy'>('tuition');
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<UserTeacher[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // Tuition state
  const [loadingTuition, setLoadingTuition] = useState(false);

  // Matrix form for course pricing
  const [matrixData, setMatrixData] = useState({
    auto_weekday: { tuitionAmount: 0, teacherSharePercent: 0, note: '' },
    auto_sunday: { tuitionAmount: 0, teacherSharePercent: 0, note: '' },
    manual_weekday: { tuitionAmount: 0, teacherSharePercent: 0, note: '' },
    manual_sunday: { tuitionAmount: 0, teacherSharePercent: 0, note: '' },
  });
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Teacher Rates state
  const [teacherRates, setTeacherRates] = useState<TeacherRateConfig[]>([]);
  const [loadingTeacherRates, setLoadingTeacherRates] = useState(false);
  const [newRate, setNewRate] = useState({
    teacherId: 0,
    courseId: '' as string | number,
    transmissionType: '',
    scheduleType: '',
    ratePercent: 60,
    note: ''
  });
  const [savingRate, setSavingRate] = useState(false);

  // Deduction Categories state
  const [deductions, setDeductions] = useState<DeductionCategory[]>([]);
  const [newDeduction, setNewDeduction] = useState({ name: '', defaultAmount: 0, description: '', isDefault: false });
  const [editingDeduction, setEditingDeduction] = useState<DeductionCategory | null>(null);

  // Policy state
  const [policy, setPolicy] = useState<AdvancePolicyConfig>({
    maxAdvancePercent: 70,
    maxAdvanceTimes: 3,
    guidelines: '',
    isActive: true,
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchCourses();
    fetchTeachers();
    fetchDeductions();
    fetchPolicy();
    fetchTeacherRates();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchTuitionConfigs(selectedCourseId);
    }
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/courses`);
      const courseList = res.data?.courses || res.data || [];
      setCourses(courseList);
      if (courseList.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courseList[0].id);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách khóa học:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/users`);
      const allUsers = res.data || [];
      const teacherList = allUsers.filter((u: any) => u.role !== 'ACCOUNTANT');
      setTeachers(teacherList);
      if (teacherList.length > 0 && !newRate.teacherId) {
        setNewRate(prev => ({ ...prev, teacherId: teacherList[0].id }));
      }
    } catch (e) {
      console.error('Lỗi tải danh sách giáo viên', e);
    }
  };

  const fetchTuitionConfigs = async (cId: number) => {
    setLoadingTuition(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/tuition-configs?courseId=${cId}`);
      const data: TuitionFeeConfig[] = res.data || [];

      const newMatrix = {
        auto_weekday: { tuitionAmount: 0, teacherSharePercent: 0, note: '' },
        auto_sunday: { tuitionAmount: 0, teacherSharePercent: 0, note: '' },
        manual_weekday: { tuitionAmount: 0, teacherSharePercent: 0, note: '' },
        manual_sunday: { tuitionAmount: 0, teacherSharePercent: 0, note: '' },
      };

      data.forEach(cfg => {
        const key = `${cfg.transmissionType.toLowerCase()}_${cfg.scheduleType.toLowerCase()}` as keyof typeof newMatrix;
        if (newMatrix[key]) {
          newMatrix[key] = {
            tuitionAmount: cfg.tuitionAmount,
            teacherSharePercent: cfg.teacherSharePercent,
            note: cfg.note || '',
          };
        }
      });

      setMatrixData(newMatrix);
    } catch (err: any) {
      toast.error('Lỗi tải biểu giá học phí');
    } finally {
      setLoadingTuition(false);
    }
  };

  const handleSaveMatrix = async () => {
    if (!selectedCourseId) {
      toast.error('Vui lòng chọn khóa học');
      return;
    }
    setSavingMatrix(true);
    try {
      const items = [
        {
          transmissionType: 'AUTO',
          scheduleType: 'WEEKDAY',
          tuitionAmount: Number(matrixData.auto_weekday.tuitionAmount),
          teacherSharePercent: Number(matrixData.auto_weekday.teacherSharePercent),
          note: matrixData.auto_weekday.note,
        },
        {
          transmissionType: 'AUTO',
          scheduleType: 'SUNDAY',
          tuitionAmount: Number(matrixData.auto_sunday.tuitionAmount),
          teacherSharePercent: Number(matrixData.auto_sunday.teacherSharePercent),
          note: matrixData.auto_sunday.note,
        },
        {
          transmissionType: 'MANUAL',
          scheduleType: 'WEEKDAY',
          tuitionAmount: Number(matrixData.manual_weekday.tuitionAmount),
          teacherSharePercent: Number(matrixData.manual_weekday.teacherSharePercent),
          note: matrixData.manual_weekday.note,
        },
        {
          transmissionType: 'MANUAL',
          scheduleType: 'SUNDAY',
          tuitionAmount: Number(matrixData.manual_sunday.tuitionAmount),
          teacherSharePercent: Number(matrixData.manual_sunday.teacherSharePercent),
          note: matrixData.manual_sunday.note,
        },
      ];

      await axios.post(`${API_BASE_URL}/api/manager/finance/tuition-configs`, {
        courseId: selectedCourseId,
        items,
      });

      toast.success('Đã lưu biểu giá học phí cho khóa học thành công!');
      fetchTuitionConfigs(selectedCourseId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi lưu biểu giá');
    } finally {
      setSavingMatrix(false);
    }
  };

  // Teacher Rates CRUD
  const fetchTeacherRates = async () => {
    setLoadingTeacherRates(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/teacher-rates`);
      setTeacherRates(res.data || []);
    } catch (e) {
      console.error('Lỗi tải tỉ lệ giáo viên', e);
    } finally {
      setLoadingTeacherRates(false);
    }
  };

  const handleSaveTeacherRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRate.teacherId) {
      toast.error('Vui lòng chọn giáo viên');
      return;
    }
    setSavingRate(true);
    try {
      await axios.post(`${API_BASE_URL}/api/manager/finance/teacher-rates`, {
        teacherId: Number(newRate.teacherId),
        courseId: newRate.courseId ? Number(newRate.courseId) : null,
        transmissionType: newRate.transmissionType || null,
        scheduleType: newRate.scheduleType || null,
        ratePercent: Number(newRate.ratePercent),
        note: newRate.note
      });
      toast.success('Cập nhật tỉ lệ hưởng cho giáo viên thành công!');
      fetchTeacherRates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi lưu tỉ lệ giáo viên');
    } finally {
      setSavingRate(false);
    }
  };

  const handleDeleteTeacherRate = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa tỉ lệ tùy chỉnh này? (Giáo viên sẽ trở về hưởng tỉ lệ mặc định của khóa)')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/finance/teacher-rates/${id}`);
      toast.success('Đã xóa tỉ lệ');
      fetchTeacherRates();
    } catch (e) {
      toast.error('Lỗi xóa tỉ lệ');
    }
  };

  // Deductions CRUD
  const fetchDeductions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/deduction-categories`);
      setDeductions(res.data || []);
    } catch (err: any) {
      toast.error('Lỗi tải danh mục khoản trừ');
    }
  };

  const handleCreateDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeduction.name.trim()) {
      toast.error('Vui lòng nhập tên khoản trừ');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/manager/finance/deduction-categories`, newDeduction);
      toast.success('Đã thêm khoản trừ mới');
      setNewDeduction({ name: '', defaultAmount: 0, description: '', isDefault: false });
      fetchDeductions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi thêm khoản trừ');
    }
  };

  const handleUpdateDeduction = async () => {
    if (!editingDeduction) return;
    try {
      await axios.put(`${API_BASE_URL}/api/manager/finance/deduction-categories/${editingDeduction.id}`, editingDeduction);
      toast.success('Cập nhật khoản trừ thành công');
      setEditingDeduction(null);
      fetchDeductions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi cập nhật khoản trừ');
    }
  };

  const handleDeleteDeduction = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa khoản trừ này khỏi danh mục?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/finance/deduction-categories/${id}`);
      toast.success('Đã xóa khoản trừ');
      fetchDeductions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi xóa khoản trừ');
    }
  };

  // Policy
  const fetchPolicy = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/advance-policy`);
      if (res.data) setPolicy(res.data);
    } catch (err: any) {
      console.error('Lỗi tải quy định tạm ứng:', err);
    }
  };

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      await axios.post(`${API_BASE_URL}/api/manager/finance/advance-policy`, policy);
      toast.success('Đã cập nhật quy định tạm ứng thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi lưu quy định tạm ứng');
    } finally {
      setSavingPolicy(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val || 0);
  };

  // Options for react-select
  const teacherOptions = teachers.map((t) => ({
    value: t.id,
    label: `${t.name} (@${t.username})`,
  }));

  const selectedTeacherOption = teacherOptions.find(opt => opt.value === newRate.teacherId) || null;

  return (
    <AdminLayout user={user}>
      <div style={{ width: '100%', maxWidth: '100%' }}>
        <h2 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={24} color="var(--primary)" /> Cấu hình Học phí & Hạn mức Tạm ứng
        </h2>

        {/* Tab Navigation */}
        <div className="tabs mb-4">
          <div
            className={`tab ${activeTab === 'tuition' ? 'active' : ''}`}
            onClick={() => setActiveTab('tuition')}
          >
            Biểu giá Học phí chung theo Khóa
          </div>
          <div
            className={`tab ${activeTab === 'teacher_rates' ? 'active' : ''}`}
            onClick={() => setActiveTab('teacher_rates')}
          >
            Cài đặt Tỉ lệ % theo từng Giáo viên
          </div>
          <div
            className={`tab ${activeTab === 'deductions' ? 'active' : ''}`}
            onClick={() => setActiveTab('deductions')}
          >
            Danh mục các khoản giảm trừ
          </div>
          <div
            className={`tab ${activeTab === 'policy' ? 'active' : ''}`}
            onClick={() => setActiveTab('policy')}
          >
            Quy định & Hạn mức Tạm ứng
          </div>
        </div>

        {/* TAB 1: BIỂU GIÁ HỌC PHÍ CHUNG THEO KHÓA */}
        {activeTab === 'tuition' && (
          <div className="card" style={{ width: '100%' }}>
            <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                  Chọn Khóa học để cấu hình biểu giá:
                </label>
                <select
                  className="form-control"
                  value={selectedCourseId || ''}
                  onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                  style={{ width: '100%' }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => selectedCourseId && fetchTuitionConfigs(selectedCourseId)}
                  disabled={loadingTuition}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <RefreshCw size={14} className={loadingTuition ? 'spin' : ''} /> Làm mới
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveMatrix}
                  disabled={savingMatrix || !selectedCourseId}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Save size={14} /> {savingMatrix ? 'Đang lưu...' : 'Lưu biểu giá'}
                </button>
              </div>
            </div>

            {loadingTuition ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Đang tải biểu giá học phí...
              </div>
            ) : (
              <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '140px' }}>Loại xe</th>
                      <th style={{ width: '180px' }}>Lịch học</th>
                      <th>Mức học phí (VNĐ)</th>
                      <th style={{ width: '130px' }}>Tỉ lệ mặc định (%)</th>
                      <th style={{ width: '180px', textAlign: 'right' }}>Thù lao chuẩn / HV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Số sàn - Ngày thường */}
                    <tr>
                      <td><span className="badge badge-info">Số sàn (Manual)</span></td>
                      <td><strong>Ngày thường (Thứ 2 - Thứ 6)</strong></td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          value={matrixData.manual_weekday.tuitionAmount || ''}
                          onChange={(e) =>
                            setMatrixData({
                              ...matrixData,
                              manual_weekday: {
                                ...matrixData.manual_weekday,
                                tuitionAmount: Number(e.target.value),
                              },
                            })
                          }
                          style={{ maxWidth: '200px' }}
                        />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatCurrency(matrixData.manual_weekday.tuitionAmount)} đ
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="%"
                          min={0}
                          max={100}
                          value={matrixData.manual_weekday.teacherSharePercent || ''}
                          onChange={(e) =>
                            setMatrixData({
                              ...matrixData,
                              manual_weekday: {
                                ...matrixData.manual_weekday,
                                teacherSharePercent: Number(e.target.value),
                              },
                            })
                          }
                          style={{ maxWidth: '90px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(
                          (matrixData.manual_weekday.tuitionAmount *
                            matrixData.manual_weekday.teacherSharePercent) / 100
                        )} đ
                      </td>
                    </tr>

                    {/* Số sàn - Cuối tuần */}
                    <tr>
                      <td><span className="badge badge-info">Số sàn (Manual)</span></td>
                      <td><strong style={{ color: 'var(--danger)' }}>Cuối tuần (Thứ 7 & Chủ nhật)</strong></td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          value={matrixData.manual_sunday.tuitionAmount || ''}
                          onChange={(e) =>
                            setMatrixData({
                              ...matrixData,
                              manual_sunday: {
                                ...matrixData.manual_sunday,
                                tuitionAmount: Number(e.target.value),
                              },
                            })
                          }
                          style={{ maxWidth: '200px' }}
                        />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatCurrency(matrixData.manual_sunday.tuitionAmount)} đ
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="%"
                          min={0}
                          max={100}
                          value={matrixData.manual_sunday.teacherSharePercent || ''}
                          onChange={(e) =>
                            setMatrixData({
                              ...matrixData,
                              manual_sunday: {
                                ...matrixData.manual_sunday,
                                teacherSharePercent: Number(e.target.value),
                              },
                            })
                          }
                          style={{ maxWidth: '90px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(
                          (matrixData.manual_sunday.tuitionAmount *
                            matrixData.manual_sunday.teacherSharePercent) / 100
                        )} đ
                      </td>
                    </tr>

                    {/* Số tự động - Ngày thường */}
                    <tr>
                      <td><span className="badge badge-primary">Số tự động (Auto)</span></td>
                      <td><strong>Ngày thường (Thứ 2 - Thứ 6)</strong></td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          value={matrixData.auto_weekday.tuitionAmount || ''}
                          onChange={(e) =>
                            setMatrixData({
                              ...matrixData,
                              auto_weekday: {
                                ...matrixData.auto_weekday,
                                tuitionAmount: Number(e.target.value),
                              },
                            })
                          }
                          style={{ maxWidth: '200px' }}
                        />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatCurrency(matrixData.auto_weekday.tuitionAmount)} đ
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="%"
                          min={0}
                          max={100}
                          value={matrixData.auto_weekday.teacherSharePercent || ''}
                          onChange={(e) =>
                            setMatrixData({
                              ...matrixData,
                              auto_weekday: {
                                ...matrixData.auto_weekday,
                                teacherSharePercent: Number(e.target.value),
                              },
                            })
                          }
                          style={{ maxWidth: '90px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(
                          (matrixData.auto_weekday.tuitionAmount *
                            matrixData.auto_weekday.teacherSharePercent) / 100
                        )} đ
                      </td>
                    </tr>

                    {/* Số tự động - Cuối tuần */}
                    <tr>
                      <td><span className="badge badge-primary">Số tự động (Auto)</span></td>
                      <td><strong style={{ color: 'var(--danger)' }}>Cuối tuần (Thứ 7 & Chủ nhật)</strong></td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          value={matrixData.auto_sunday.tuitionAmount || ''}
                          onChange={(e) =>
                            setMatrixData({
                              ...matrixData,
                              auto_sunday: {
                                ...matrixData.auto_sunday,
                                tuitionAmount: Number(e.target.value),
                              },
                            })
                          }
                          style={{ maxWidth: '200px' }}
                        />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatCurrency(matrixData.auto_sunday.tuitionAmount)} đ
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="%"
                          min={0}
                          max={100}
                          value={matrixData.auto_sunday.teacherSharePercent || ''}
                          onChange={(e) =>
                            setMatrixData({
                              ...matrixData,
                              auto_sunday: {
                                ...matrixData.auto_sunday,
                                teacherSharePercent: Number(e.target.value),
                              },
                            })
                          }
                          style={{ maxWidth: '90px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(
                          (matrixData.auto_sunday.tuitionAmount *
                            matrixData.auto_sunday.teacherSharePercent) / 100
                        )} đ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CÀI ĐẶT TỈ LỆ % RIÊNG CHO TỪNG GIÁO VIÊN - THIẾT KẾ MỘT CỘT FULL MÀN HÌNH */}
        {activeTab === 'teacher_rates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* Form thiết lập tỉ lệ - Full width */}
            <div className="card" style={{ width: '100%' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="var(--primary)" /> Thiết lập Tỉ lệ Hưởng cho Giáo viên
              </h3>

              <form onSubmit={handleSaveTeacherRate}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {/* Dropdown thông minh chọn Giáo viên */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Chọn Giáo viên <span style={{ color: 'var(--danger)' }}>*</span>:
                    </label>
                    <Select
                      options={teacherOptions}
                      value={selectedTeacherOption}
                      onChange={(opt: any) => setNewRate({ ...newRate, teacherId: opt ? opt.value : 0 })}
                      placeholder="🔍 Gõ tên hoặc tài khoản để tìm nhanh..."
                      isClearable={false}
                      styles={{
                        control: (base: any, state: any) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)',
                          boxShadow: state.isFocused ? '0 0 0 1px var(--primary)' : 'none',
                          borderRadius: 'var(--radius)',
                          '&:hover': { borderColor: 'var(--primary)' }
                        }),
                        singleValue: (base: any) => ({
                          ...base,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }),
                        menu: (base: any) => ({
                          ...base,
                          zIndex: 9999
                        })
                      }}
                    />
                  </div>

                  {/* Chọn khóa học áp dụng */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Áp dụng cho Khóa học:
                    </label>
                    <select
                      className="form-control"
                      value={newRate.courseId}
                      onChange={(e) => setNewRate({ ...newRate, courseId: e.target.value })}
                      style={{ minHeight: '40px', width: '100%' }}
                    >
                      <option value="">-- Áp dụng cho TẤT CẢ các khóa học --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tỉ lệ % */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Tỉ lệ % giáo viên được hưởng <span style={{ color: 'var(--danger)' }}>*</span>:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        max={100}
                        value={newRate.ratePercent}
                        onChange={(e) => setNewRate({ ...newRate, ratePercent: Number(e.target.value) })}
                        required
                        style={{ fontWeight: 'bold', fontSize: '1.1rem', minHeight: '40px', flex: 1 }}
                      />
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>%</span>
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Ghi chú / Quyết định:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Hợp đồng đặc biệt, GV chính thức..."
                      value={newRate.note}
                      onChange={(e) => setNewRate({ ...newRate, note: e.target.value })}
                      style={{ minHeight: '40px', width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingRate}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.5rem', fontWeight: 600 }}
                  >
                    <Save size={16} /> {savingRate ? 'Đang lưu...' : 'Lưu Tỉ Lệ Giáo Viên'}
                  </button>
                </div>
              </form>
            </div>

            {/* Bảng danh sách tỉ lệ riêng - Full width */}
            <div className="card" style={{ width: '100%' }}>
              <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
                  Danh sách Tỉ lệ Giáo viên đã cài đặt ({teacherRates.length})
                </h3>
                <button
                  className="btn btn-secondary"
                  onClick={fetchTeacherRates}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px' }}
                >
                  <RefreshCw size={13} className={loadingTeacherRates ? 'spin' : ''} /> Làm mới
                </button>
              </div>

              <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>STT</th>
                      <th>Giáo viên</th>
                      <th>Khóa học áp dụng</th>
                      <th style={{ textAlign: 'center', width: '150px' }}>Tỉ lệ % Hưởng</th>
                      <th>Ghi chú / Quyết định</th>
                      <th style={{ textAlign: 'center', width: '80px' }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherRates.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Chưa có tỉ lệ tùy chỉnh riêng nào. Tất cả GV đang áp dụng tỉ lệ mặc định theo từng khóa học.
                        </td>
                      </tr>
                    ) : (
                      teacherRates.map((r, idx) => (
                        <tr key={r.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{r.teacher?.name}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{r.teacher?.username}</div>
                          </td>
                          <td>
                            {r.course ? (
                              <span className="badge badge-info">{r.course.name}</span>
                            ) : (
                              <span className="badge badge-primary">Tất cả các khóa</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--success)' }}>
                            {r.ratePercent}%
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.note || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="action-btn btn-delete"
                              onClick={() => handleDeleteTeacherRate(r.id)}
                              title="Xóa tỉ lệ"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DANH MỤC CÁC KHOẢN GIẢM TRỪ - THIẾT KẾ MỘT CỘT FULL MÀN HÌNH */}
        {activeTab === 'deductions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* Form thêm / sửa khoản trừ */}
            <div className="card" style={{ width: '100%' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                {editingDeduction ? 'Chỉnh sửa Khoản giảm trừ' : 'Thêm mới Khoản giảm trừ'}
              </h3>
              <form onSubmit={editingDeduction ? (e) => { e.preventDefault(); handleUpdateDeduction(); } : handleCreateDeduction}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Tên khoản trừ <span style={{ color: 'var(--danger)' }}>*</span>:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Tiền thuê sân, Tiền xăng xe, Phạt trễ hạn..."
                      value={editingDeduction ? editingDeduction.name : newDeduction.name}
                      onChange={(e) =>
                        editingDeduction
                          ? setEditingDeduction({ ...editingDeduction, name: e.target.value })
                          : setNewDeduction({ ...newDeduction, name: e.target.value })
                      }
                      required
                      style={{ minHeight: '40px' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Số tiền mặc định (nếu có):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0"
                        value={editingDeduction ? editingDeduction.defaultAmount : newDeduction.defaultAmount}
                        onChange={(e) =>
                          editingDeduction
                            ? setEditingDeduction({ ...editingDeduction, defaultAmount: Number(e.target.value) })
                            : setNewDeduction({ ...newDeduction, defaultAmount: Number(e.target.value) })
                        }
                        style={{ minHeight: '40px', flex: 1 }}
                      />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>VNĐ</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                    <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Mô tả / Hướng dẫn áp dụng khoản trừ:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Quy định áp dụng khoản trừ này..."
                      value={editingDeduction ? (editingDeduction.description || '') : newDeduction.description}
                      onChange={(e) =>
                        editingDeduction
                          ? setEditingDeduction({ ...editingDeduction, description: e.target.value })
                          : setNewDeduction({ ...newDeduction, description: e.target.value })
                      }
                      style={{ minHeight: '40px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.2rem' }}>
                  {editingDeduction && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingDeduction(null)}
                      style={{ padding: '0.6rem 1.2rem' }}
                    >
                      Hủy bỏ
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.6rem 1.5rem', fontWeight: 600 }}>
                    <Save size={16} />
                    {editingDeduction ? 'Cập nhật Khoản trừ' : 'Thêm Khoản trừ'}
                  </button>
                </div>
              </form>
            </div>

            {/* Bảng danh sách khoản trừ */}
            <div className="card" style={{ width: '100%' }}>
              <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
                  Danh sách Khoản giảm trừ ({deductions.length})
                </h3>
                <button className="btn btn-secondary" onClick={fetchDeductions} style={{ padding: '5px 10px' }}>
                  <RefreshCw size={13} /> Làm mới
                </button>
              </div>

              <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>STT</th>
                      <th>Tên khoản trừ</th>
                      <th>Mô tả / Hướng dẫn</th>
                      <th style={{ textAlign: 'right', width: '180px' }}>Mức trừ mặc định</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Chưa có khoản giảm trừ nào trong danh mục.
                        </td>
                      </tr>
                    ) : (
                      deductions.map((d, idx) => (
                        <tr key={d.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{d.name}</strong>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {d.description || '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)', fontSize: '1rem' }}>
                            {d.defaultAmount > 0 ? `${formatCurrency(d.defaultAmount)} đ` : 'Nhập tay khi duyệt'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button
                                className="action-btn btn-edit"
                                onClick={() => setEditingDeduction(d)}
                                title="Sửa"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                className="action-btn btn-delete"
                                onClick={() => handleDeleteDeduction(d.id)}
                                title="Xóa"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: QUY ĐỊNH & HẠN MỨC TẠM ỨNG - THIẾT KẾ FULL MÀN HÌNH */}
        {activeTab === 'policy' && (
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Thiết lập Quy định Tạm ứng dành cho Giáo viên
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Hệ thống áp dụng các tham số này để tự động kiểm tra và giới hạn số tiền tạm ứng tối đa khi giáo viên nộp đơn đăng ký.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                  Mức % tạm ứng tối đa cho phép (% trên thù lao ước tính):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={100}
                    value={policy.maxAdvancePercent}
                    onChange={(e) => setPolicy({ ...policy, maxAdvancePercent: Number(e.target.value) })}
                    style={{ height: '42px', fontWeight: 'bold', fontSize: '1.1rem', maxWidth: '200px' }}
                  />
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>%</span>
                </div>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                  Ví dụ: 70% nghĩa là giáo viên có tổng thù lao khóa 10.000.000 đ thì chỉ được tạm ứng tối đa 7.000.000 đ trước khi bế giảng.
                </small>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                  Số lần tạm ứng tối đa trong một khóa học:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={10}
                    value={policy.maxAdvanceTimes}
                    onChange={(e) => setPolicy({ ...policy, maxAdvanceTimes: Number(e.target.value) })}
                    style={{ height: '42px', fontWeight: 'bold', fontSize: '1.1rem', maxWidth: '200px' }}
                  />
                  <span style={{ fontSize: '1rem' }}>lần</span>
                </div>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                  Số lần tối đa giáo viên được nộp phiếu đề nghị tạm ứng trong cùng 1 khóa.
                </small>
              </div>
            </div>

            <div className="form-group mb-4">
              <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                Thông báo / Hướng dẫn quy định (hiển thị trực tiếp trên form của Giáo viên):
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={policy.guidelines || ''}
                onChange={(e) => setPolicy({ ...policy, guidelines: e.target.value })}
                placeholder="Nhập nội dung quy định, thời hạn nộp đơn, lưu ý cho giáo viên..."
                style={{ width: '100%' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleSavePolicy}
                disabled={savingPolicy}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.8rem', fontWeight: 600 }}
              >
                <Save size={16} />
                {savingPolicy ? 'Đang lưu...' : 'Lưu thiết lập quy định'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
