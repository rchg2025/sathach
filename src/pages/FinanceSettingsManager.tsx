import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Settings, Trash2, Edit3, Save, RefreshCw, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';

const API_BASE_URL = '';

interface Course {
  id: number;
  name: string;
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

export default function FinanceSettingsManager() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tuition' | 'deductions' | 'policy'>('tuition');
  const [courses, setCourses] = useState<Course[]>([]);
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
    fetchDeductions();
    fetchPolicy();
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

  const fetchTuitionConfigs = async (cId: number) => {
    setLoadingTuition(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/tuition-configs?courseId=${cId}`);
      const data: TuitionFeeConfig[] = res.data || [];

      // Populate matrixData
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

  return (
    <AdminLayout user={user}>
      <div className="container-fluid py-4" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
          <div>
            <h2 className="mb-1" style={{ fontWeight: '700', color: '#1e293b' }}>
              <DollarSign className="me-2 text-primary" size={28} />
              Quản lý Học phí & Định mức Tạm ứng
            </h2>
            <p className="text-muted mb-0 small">
              Cấu hình biểu giá học phí theo khóa (loại xe & ngày học), danh mục khoản giảm trừ và hạn mức tạm ứng của giáo viên.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'tuition' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('tuition')}
            >
              <DollarSign size={16} className="me-1" /> Biểu giá Học phí & Tỉ lệ hưởng
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'deductions' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('deductions')}
            >
              <Layers size={16} className="me-1" /> Danh mục các khoản giảm trừ
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'policy' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('policy')}
            >
              <Settings size={16} className="me-1" /> Quy định & Hạn mức Tạm ứng
            </button>
          </li>
        </ul>

        {/* TAB 1: BIỂU GIÁ HỌC PHÍ */}
        {activeTab === 'tuition' && (
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-4">
              <div className="row align-items-center mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Chọn Khóa học để cấu hình biểu giá:</label>
                  <select
                    className="form-select form-select-lg"
                    value={selectedCourseId || ''}
                    onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 text-md-end mt-3 mt-md-0">
                  <button
                    className="btn btn-outline-secondary me-2"
                    onClick={() => selectedCourseId && fetchTuitionConfigs(selectedCourseId)}
                    disabled={loadingTuition}
                  >
                    <RefreshCw size={16} className={`me-1 ${loadingTuition ? 'spin' : ''}`} /> Làm mới
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveMatrix}
                    disabled={savingMatrix || !selectedCourseId}
                  >
                    <Save size={16} className="me-1" /> {savingMatrix ? 'Đang lưu...' : 'Lưu biểu giá khóa học'}
                  </button>
                </div>
              </div>

              {loadingTuition ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <div className="text-muted mt-2">Đang tải biểu giá học phí...</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead className="table-light">
                      <tr className="text-center">
                        <th style={{ width: '15%' }}>Loại xe</th>
                        <th style={{ width: '15%' }}>Thời gian học</th>
                        <th style={{ width: '25%' }}>Mức học phí (VNĐ)</th>
                        <th style={{ width: '20%' }}>Tỉ lệ GV hưởng (%)</th>
                        <th style={{ width: '25%' }}>Thù lao tính trên 1 HV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Số sàn - Ngày thường */}
                      <tr>
                        <td rowSpan={2} className="fw-bold bg-light text-center">
                          <span className="badge bg-secondary p-2">Số sàn (Manual)</span>
                        </td>
                        <td>
                          <span className="fw-semibold">Ngày thường (T2 - T7)</span>
                        </td>
                        <td>
                          <div className="input-group">
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
                            />
                            <span className="input-group-text">đ</span>
                          </div>
                          <div className="text-muted small mt-1">
                            {formatCurrency(matrixData.manual_weekday.tuitionAmount)} VNĐ
                          </div>
                        </td>
                        <td>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control"
                              placeholder="0"
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
                            />
                            <span className="input-group-text">%</span>
                          </div>
                        </td>
                        <td className="text-end fw-bold text-success">
                          {formatCurrency(
                            (matrixData.manual_weekday.tuitionAmount *
                              matrixData.manual_weekday.teacherSharePercent) /
                              100
                          )}{' '}
                          VNĐ
                        </td>
                      </tr>

                      {/* Số sàn - Chủ nhật */}
                      <tr>
                        <td>
                          <span className="fw-semibold text-danger">Chủ nhật (Cuối tuần)</span>
                        </td>
                        <td>
                          <div className="input-group">
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
                            />
                            <span className="input-group-text">đ</span>
                          </div>
                          <div className="text-muted small mt-1">
                            {formatCurrency(matrixData.manual_sunday.tuitionAmount)} VNĐ
                          </div>
                        </td>
                        <td>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control"
                              placeholder="0"
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
                            />
                            <span className="input-group-text">%</span>
                          </div>
                        </td>
                        <td className="text-end fw-bold text-success">
                          {formatCurrency(
                            (matrixData.manual_sunday.tuitionAmount *
                              matrixData.manual_sunday.teacherSharePercent) /
                              100
                          )}{' '}
                          VNĐ
                        </td>
                      </tr>

                      {/* Số tự động - Ngày thường */}
                      <tr>
                        <td rowSpan={2} className="fw-bold bg-light text-center">
                          <span className="badge bg-primary p-2">Số tự động (Auto)</span>
                        </td>
                        <td>
                          <span className="fw-semibold">Ngày thường (T2 - T7)</span>
                        </td>
                        <td>
                          <div className="input-group">
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
                            />
                            <span className="input-group-text">đ</span>
                          </div>
                          <div className="text-muted small mt-1">
                            {formatCurrency(matrixData.auto_weekday.tuitionAmount)} VNĐ
                          </div>
                        </td>
                        <td>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control"
                              placeholder="0"
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
                            />
                            <span className="input-group-text">%</span>
                          </div>
                        </td>
                        <td className="text-end fw-bold text-success">
                          {formatCurrency(
                            (matrixData.auto_weekday.tuitionAmount *
                              matrixData.auto_weekday.teacherSharePercent) /
                              100
                          )}{' '}
                          VNĐ
                        </td>
                      </tr>

                      {/* Số tự động - Chủ nhật */}
                      <tr>
                        <td>
                          <span className="fw-semibold text-danger">Chủ nhật (Cuối tuần)</span>
                        </td>
                        <td>
                          <div className="input-group">
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
                            />
                            <span className="input-group-text">đ</span>
                          </div>
                          <div className="text-muted small mt-1">
                            {formatCurrency(matrixData.auto_sunday.tuitionAmount)} VNĐ
                          </div>
                        </td>
                        <td>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control"
                              placeholder="0"
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
                            />
                            <span className="input-group-text">%</span>
                          </div>
                        </td>
                        <td className="text-end fw-bold text-success">
                          {formatCurrency(
                            (matrixData.auto_sunday.tuitionAmount *
                              matrixData.auto_sunday.teacherSharePercent) /
                              100
                          )}{' '}
                          VNĐ
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DANH MỤC CÁC KHOẢN GIẢM TRỪ */}
        {activeTab === 'deductions' && (
          <div className="row">
            <div className="col-md-5 mb-4">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 fw-bold">
                  {editingDeduction ? 'Chỉnh sửa Khoản giảm trừ' : 'Thêm mới Khoản giảm trừ'}
                </div>
                <div className="card-body">
                  <form onSubmit={editingDeduction ? (e) => { e.preventDefault(); handleUpdateDeduction(); } : handleCreateDeduction}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Tên khoản trừ <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ví dụ: Tiền thuê sân, Tiền xăng xe, Phạt trễ hạn..."
                        value={editingDeduction ? editingDeduction.name : newDeduction.name}
                        onChange={(e) =>
                          editingDeduction
                            ? setEditingDeduction({ ...editingDeduction, name: e.target.value })
                            : setNewDeduction({ ...newDeduction, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Số tiền mặc định (nếu có)</label>
                      <div className="input-group">
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
                        />
                        <span className="input-group-text">VNĐ</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Mô tả / Ghi chú</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Quy định áp dụng khoản trừ này..."
                        value={editingDeduction ? (editingDeduction.description || '') : newDeduction.description}
                        onChange={(e) =>
                          editingDeduction
                            ? setEditingDeduction({ ...editingDeduction, description: e.target.value })
                            : setNewDeduction({ ...newDeduction, description: e.target.value })
                        }
                      ></textarea>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                      {editingDeduction && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setEditingDeduction(null)}
                        >
                          Hủy bỏ
                        </button>
                      )}
                      <button type="submit" className="btn btn-primary">
                        <Save size={16} className="me-1" />
                        {editingDeduction ? 'Cập nhật' : 'Thêm khoản trừ'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="col-md-7 mb-4">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <span className="fw-bold">Danh sách các Khoản trừ hiện tại ({deductions.length})</span>
                  <button className="btn btn-sm btn-outline-secondary" onClick={fetchDeductions}>
                    <RefreshCw size={14} className="me-1" /> Làm mới
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Tên khoản trừ</th>
                          <th className="text-end">Mức trừ mặc định</th>
                          <th>Trạng thái</th>
                          <th className="text-center" style={{ width: '100px' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deductions.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-4 text-muted">
                              Chưa có khoản giảm trừ nào trong danh mục.
                            </td>
                          </tr>
                        ) : (
                          deductions.map((d) => (
                            <tr key={d.id}>
                              <td>
                                <div className="fw-bold">{d.name}</div>
                                {d.description && <div className="text-muted small">{d.description}</div>}
                              </td>
                              <td className="text-end fw-semibold text-danger">
                                {d.defaultAmount > 0 ? `${formatCurrency(d.defaultAmount)} đ` : 'Nhập tay khi duyệt'}
                              </td>
                              <td>
                                <span className={`badge ${d.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                  {d.isActive ? 'Đang dùng' : 'Tạm khóa'}
                                </span>
                              </td>
                              <td className="text-center">
                                <button
                                  className="btn btn-sm btn-outline-primary me-1"
                                  onClick={() => setEditingDeduction(d)}
                                  title="Chỉnh sửa"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteDeduction(d.id)}
                                  title="Xóa"
                                >
                                  <Trash2 size={14} />
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
            </div>
          </div>
        )}

        {/* TAB 3: QUY ĐỊNH & HẠN MỨC TẠM ỨNG */}
        {activeTab === 'policy' && (
          <div className="card shadow-sm border-0 mb-4" style={{ maxWidth: '800px' }}>
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Thiết lập Quy định Tạm ứng dành cho Giáo viên</h5>
              <p className="text-muted small mb-4">
                Hệ thống sẽ áp dụng các tham số này để tự động kiểm tra và giới hạn số tiền tạm ứng tối đa khi giáo viên nộp đơn đăng ký.
              </p>

              <div className="mb-4">
                <label className="form-label fw-bold">
                  Mức % tạm ứng tối đa cho phép (% trên tổng thù lao dự kiến của khóa):
                </label>
                <div className="input-group" style={{ maxWidth: '250px' }}>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={100}
                    value={policy.maxAdvancePercent}
                    onChange={(e) => setPolicy({ ...policy, maxAdvancePercent: Number(e.target.value) })}
                  />
                  <span className="input-group-text fw-bold">%</span>
                </div>
                <div className="form-text">
                  Ví dụ: Nếu đặt là 70%, giáo viên có tổng thù lao 10.000.000 đ thì chỉ được tạm ứng tối đa 7.000.000 đ trước khi bế giảng.
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold">Số lần tạm ứng tối đa trong một khóa học:</label>
                <div className="input-group" style={{ maxWidth: '250px' }}>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={10}
                    value={policy.maxAdvanceTimes}
                    onChange={(e) => setPolicy({ ...policy, maxAdvanceTimes: Number(e.target.value) })}
                  />
                  <span className="input-group-text">lần</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold">Thông báo / Hướng dẫn quy định (hiển thị trên form của Giáo viên):</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={policy.guidelines || ''}
                  onChange={(e) => setPolicy({ ...policy, guidelines: e.target.value })}
                  placeholder="Nhập nội dung quy định, thời hạn nộp đơn, lưu ý cho giáo viên..."
                ></textarea>
              </div>

              <button
                className="btn btn-primary px-4 py-2"
                onClick={handleSavePolicy}
                disabled={savingPolicy}
              >
                <Save size={16} className="me-2" />
                {savingPolicy ? 'Đang lưu...' : 'Lưu thiết lập quy định'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
