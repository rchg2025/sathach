import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Trash2, Edit3, Save, RefreshCw } from 'lucide-react';
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
      <div>
        <h2 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={24} color="var(--primary)" /> Cấu hình Học phí & Hạn mức Tạm ứng
        </h2>

        {/* Tab Navigation - Chuẩn phong cách dự án */}
        <div className="tabs mb-4">
          <div
            className={`tab ${activeTab === 'tuition' ? 'active' : ''}`}
            onClick={() => setActiveTab('tuition')}
          >
            Biểu giá Học phí & Tỉ lệ hưởng
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

        {/* TAB 1: BIỂU GIÁ HỌC PHÍ */}
        {activeTab === 'tuition' && (
          <div className="card">
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
                      <th style={{ width: '160px' }}>Lịch học</th>
                      <th>Mức học phí (VNĐ)</th>
                      <th style={{ width: '120px' }}>Tỉ lệ GV (%)</th>
                      <th style={{ width: '180px', textAlign: 'right' }}>Thù lao dự kiến / HV</th>
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

        {/* TAB 2: DANH MỤC CÁC KHOẢN GIẢM TRỪ */}
        {activeTab === 'deductions' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Form thêm / sửa */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                {editingDeduction ? 'Chỉnh sửa Khoản giảm trừ' : 'Thêm mới Khoản giảm trừ'}
              </h3>
              <form onSubmit={editingDeduction ? (e) => { e.preventDefault(); handleUpdateDeduction(); } : handleCreateDeduction}>
                <div className="form-group">
                  <label>Tên khoản trừ <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Tiền thuê sân, Tiền xăng xe..."
                    value={editingDeduction ? editingDeduction.name : newDeduction.name}
                    onChange={(e) =>
                      editingDeduction
                        ? setEditingDeduction({ ...editingDeduction, name: e.target.value })
                        : setNewDeduction({ ...newDeduction, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số tiền mặc định (nếu có)</label>
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
                </div>
                <div className="form-group">
                  <label>Mô tả / Ghi chú</label>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                  {editingDeduction && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingDeduction(null)}
                    >
                      Hủy bỏ
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Save size={14} />
                    {editingDeduction ? 'Cập nhật' : 'Thêm khoản trừ'}
                  </button>
                </div>
              </form>
            </div>

            {/* Bảng danh sách */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                  Danh sách Khoản giảm trừ ({deductions.length})
                </h3>
                <button className="btn btn-secondary" onClick={fetchDeductions} style={{ padding: '4px 8px', fontSize: '0.85rem' }}>
                  <RefreshCw size={12} />
                </button>
              </div>

              <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tên khoản trừ</th>
                      <th style={{ textAlign: 'right' }}>Mức trừ mặc định</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                          Chưa có khoản giảm trừ nào.
                        </td>
                      </tr>
                    ) : (
                      deductions.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <strong>{d.name}</strong>
                            {d.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.description}</div>}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                            {d.defaultAmount > 0 ? `${formatCurrency(d.defaultAmount)} đ` : 'Nhập tay'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                              <button
                                className="action-btn btn-edit"
                                onClick={() => setEditingDeduction(d)}
                                title="Sửa"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="action-btn btn-delete"
                                onClick={() => handleDeleteDeduction(d.id)}
                                title="Xóa"
                              >
                                <Trash2 size={14} />
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

        {/* TAB 3: QUY ĐỊNH & HẠN MỨC TẠM ỨNG */}
        {activeTab === 'policy' && (
          <div className="card" style={{ maxWidth: '750px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Thiết lập Quy định Tạm ứng</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Hệ thống áp dụng các tham số này để tự động kiểm tra và giới hạn số tiền tạm ứng tối đa khi giáo viên nộp đơn đăng ký.
            </p>

            <div className="form-group mb-3">
              <label style={{ fontWeight: 600 }}>Mức % tạm ứng tối đa cho phép (% trên thù lao ước tính):</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '250px' }}>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={100}
                  value={policy.maxAdvancePercent}
                  onChange={(e) => setPolicy({ ...policy, maxAdvancePercent: Number(e.target.value) })}
                />
                <span style={{ fontWeight: 'bold' }}>%</span>
              </div>
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Ví dụ: 70% nghĩa là giáo viên có tổng thù lao khóa 10.000.000 đ thì chỉ được tạm ứng tối đa 7.000.000 đ trước khi bế giảng.
              </small>
            </div>

            <div className="form-group mb-3">
              <label style={{ fontWeight: 600 }}>Số lần tạm ứng tối đa trong một khóa học:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '250px' }}>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={10}
                  value={policy.maxAdvanceTimes}
                  onChange={(e) => setPolicy({ ...policy, maxAdvanceTimes: Number(e.target.value) })}
                />
                <span>lần</span>
              </div>
            </div>

            <div className="form-group mb-4">
              <label style={{ fontWeight: 600 }}>Thông báo / Hướng dẫn quy định (hiển thị trên form của Giáo viên):</label>
              <textarea
                className="form-control"
                rows={4}
                value={policy.guidelines || ''}
                onChange={(e) => setPolicy({ ...policy, guidelines: e.target.value })}
                placeholder="Nhập nội dung quy định, thời hạn nộp đơn, lưu ý cho giáo viên..."
              ></textarea>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSavePolicy}
              disabled={savingPolicy}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}
            >
              <Save size={16} />
              {savingPolicy ? 'Đang lưu...' : 'Lưu thiết lập quy định'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
