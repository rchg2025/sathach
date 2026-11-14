import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { CreditCard, FilePlus, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Trash2, Users, History, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { numberToWordsVietnamese, formatCurrencyNumber, parseCurrencyInput } from '../utils/currencyUtils';

const API_BASE_URL = '';

interface Course {
  id: number;
  name: string;
}

interface DeductionCategory {
  id: number;
  name: string;
  defaultAmount: number;
}

interface EstimateData {
  studentCount: number;
  grossEstimatedAmount: number;
  maxAdvancePercent: number;
  maxAdvanceTimes: number;
  existingRequestCount: number;
  totalPreviouslyRequested: number;
  maxAdvanceAllowedTotal: number;
  remainingAdvanceAllowed: number;
  policyGuidelines: string;
  students: Array<{
    id: number;
    name: string;
    cccd: string;
    transmissionType: string;
    scheduleType: string;
    tuitionAmount: number;
    teacherSharePercent: number;
    earnedAmount: number;
  }>;
}

interface AdvanceRequest {
  id: number;
  requestCode: string;
  studentCount: number;
  grossEstimatedAmount: number;
  maxAllowedAmount: number;
  totalDeductions: number;
  requestedAmount: number;
  approvedAmount?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  reason?: string;
  accountantNotes?: string;
  paymentReference?: string;
  createdAt: string;
  course: { id: number; name: string };
  deductions: Array<{ id: number; name: string; amount: number; note?: string }>;
}

export default function TeacherAdvanceRequest() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // Estimate
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Request form state
  const [requestedAmount, setRequestedAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [deductionCategories, setDeductionCategories] = useState<DeductionCategory[]>([]);
  const [selectedDeductions, setSelectedDeductions] = useState<Array<{ deductionCategoryId?: number; name: string; amount: number; note: string }>>([]);

  const [submitting, setSubmitting] = useState(false);

  // History state
  const [history, setHistory] = useState<AdvanceRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewRequest, setViewRequest] = useState<AdvanceRequest | null>(null);

  useEffect(() => {
    const uStr = localStorage.getItem('user');
    if (uStr) {
      const u = JSON.parse(uStr);
      setUser(u);
      fetchCourses(u.id);
      fetchHistory(u.id);
    }
    fetchDeductionCategories();
  }, []);

  const fetchCourses = async (teacherId: number) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/courses`);
      const courseList: Course[] = res.data?.courses || res.data || [];
      // Sắp xếp khóa mới nhất lên trên cùng
      courseList.sort((a, b) => b.id - a.id);
      setCourses(courseList);
      if (courseList.length > 0) {
        setSelectedCourseId(courseList[0].id);
        fetchEstimate(teacherId, courseList[0].id);
      }
    } catch (err: any) {
      toast.error('Lỗi tải danh sách khóa học');
    }
  };

  const fetchDeductionCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/deduction-categories`);
      setDeductionCategories(res.data || []);
    } catch (err: any) {
      console.error('Lỗi tải danh mục khoản trừ', err);
    }
  };

  const fetchEstimate = async (teacherId: number, courseId: number) => {
    setLoadingEstimate(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/estimate`, {
        params: { teacherId, courseId }
      });
      setEstimate(res.data);
      if (res.data.remainingAdvanceAllowed > 0 && requestedAmount === 0) {
        setRequestedAmount(res.data.remainingAdvanceAllowed);
      }
    } catch (err: any) {
      console.error('Lỗi ước tính thù lao', err);
      toast.error(err.response?.data?.error || 'Lỗi tính toán thù lao cho khóa');
      setEstimate(null);
    } finally {
      setLoadingEstimate(false);
    }
  };

  const fetchHistory = async (teacherId: number) => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/advance-requests`, {
        params: { teacherId }
      });
      setHistory(res.data || []);
    } catch (err: any) {
      console.error('Lỗi tải lịch sử tạm ứng', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCourseChange = (cId: number) => {
    setSelectedCourseId(cId);
    setRequestedAmount(0);
    setSelectedDeductions([]);
    if (user?.id) {
      fetchEstimate(user.id, cId);
    }
  };

  const handleAddDeduction = (catId?: number) => {
    if (catId) {
      const cat = deductionCategories.find(c => c.id === catId);
      if (cat) {
        setSelectedDeductions([
          ...selectedDeductions,
          { deductionCategoryId: cat.id, name: cat.name, amount: cat.defaultAmount, note: '' }
        ]);
        return;
      }
    }
    setSelectedDeductions([
      ...selectedDeductions,
      { name: '', amount: 0, note: '' }
    ]);
  };

  const handleRemoveDeduction = (index: number) => {
    setSelectedDeductions(selectedDeductions.filter((_, i) => i !== index));
  };

  const calculateTotalDeductions = () => {
    return selectedDeductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Vui lòng chọn khóa học');
      return;
    }
    if (!requestedAmount || requestedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền muốn tạm ứng lớn hơn 0');
      return;
    }
    if (estimate && requestedAmount > estimate.remainingAdvanceAllowed) {
      toast.error(`Số tiền tạm ứng không được vượt quá số tiền còn được phép (${formatCurrency(estimate.remainingAdvanceAllowed)} đ)`);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/manager/finance/advance-requests`, {
        teacherId: user.id,
        courseId: selectedCourseId,
        requestedAmount: Number(requestedAmount),
        reason,
        deductions: selectedDeductions
      });

      toast.success('Gửi đơn đề nghị tạm ứng thành công! Đang chờ Kế toán kiểm tra & duyệt chi.');
      setReason('');
      setSelectedDeductions([]);
      if (user?.id) {
        fetchEstimate(user.id, selectedCourseId);
        fetchHistory(user.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi gửi đơn tạm ứng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraft = async (id: number) => {
    if (!confirm('Bạn có chắc muốn hủy đơn đề nghị tạm ứng này?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/finance/advance-requests/${id}`);
      toast.success('Đã hủy đơn đề nghị');
      if (user?.id && selectedCourseId) {
        fetchEstimate(user.id, selectedCourseId);
        fetchHistory(user.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi hủy đơn');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Chờ duyệt</span>;
      case 'APPROVED':
        return <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Đã duyệt</span>;
      case 'PAID':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Đã chi tiền</span>;
      case 'REJECTED':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Từ chối</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.name
  }));

  const selectedCourseOption = courseOptions.find(opt => opt.value === selectedCourseId) || null;

  return (
    <AdminLayout user={user}>
      <div style={{ maxWidth: '100%', width: '100%', paddingBottom: '2rem' }}>
        {/* Tiêu đề & nút làm mới */}
        <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.4rem' }}>
              <CreditCard size={24} color="var(--primary)" /> Đăng ký Tạm ứng Thù lao Giáo viên
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
              Đăng ký tạm ứng thù lao dựa trên số lượng học viên được phân công và tỉ lệ hưởng của khóa học
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (user?.id && selectedCourseId) {
                fetchEstimate(user.id, selectedCourseId);
                fetchHistory(user.id);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '40px' }}
          >
            <RefreshCw size={14} className={loadingEstimate || loadingHistory ? 'spin' : ''} /> Làm mới
          </button>
        </div>

        {/* Thông báo quy định nếu có */}
        {estimate?.policyGuidelines && (
          <div className="card" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd', marginBottom: '1.5rem', padding: '1rem', width: '100%' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#0369a1' }}>Quy định Tạm ứng từ Phòng Kế toán:</strong>
                <div style={{ fontSize: '0.875rem', color: '#0f172a', marginTop: '4px' }}>
                  {estimate.policyGuidelines}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BỐ CỤC 1 CỘT FULL MÀN HÌNH - TỐI ƯU DESKTOP VÀ MOBILE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>

          {/* KHỐI 1: FORM LẬP ĐƠN ĐỀ NGHỊ TẠM ỨNG (FULL WIDTH) */}
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilePlus size={20} color="var(--primary)" /> Lập Đơn Đề Nghị Tạm Ứng
            </h3>

            <form onSubmit={handleSubmitRequest}>
              {/* Chọn khóa học & Thống kê hạn mức */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginBottom: '1.2rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                    1. Chọn Khóa học áp dụng: <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <Select
                    options={courseOptions}
                    value={selectedCourseOption}
                    onChange={(opt: any) => opt && handleCourseChange(opt.value)}
                    placeholder="🔍 Tìm & chọn khóa học..."
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

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                    2. Số tiền đề nghị tạm ứng <span style={{ color: 'var(--danger)' }}>*</span>:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="0"
                      value={requestedAmount ? formatCurrencyNumber(requestedAmount) : ''}
                      onChange={(e) => setRequestedAmount(parseCurrencyInput(e.target.value))}
                      required
                      style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--primary)', minHeight: '40px', flex: 1 }}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-muted)' }}>VNĐ</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 500 }}>
                    Bằng chữ: <em>{numberToWordsVietnamese(requestedAmount)}</em>
                  </div>
                </div>
              </div>

              {/* Box Thống kê hạn mức thù lao của khóa */}
              {loadingEstimate ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', background: 'var(--background)', borderRadius: 'var(--radius)', marginBottom: '1.2rem' }}>
                  <RefreshCw size={18} className="spin" style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }} />
                  Đang tính toán số lượng học viên & hạn mức thù lao của khóa...
                </div>
              ) : estimate ? (
                <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0', marginBottom: '1.2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ background: '#fff', padding: '0.8rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Số học viên phụ trách</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '2px' }}>{estimate.studentCount} HV</div>
                    </div>
                    <div style={{ background: '#fff', padding: '0.8rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng thù lao ước tính</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '2px' }}>{formatCurrency(estimate.grossEstimatedAmount)} đ</div>
                    </div>
                    <div style={{ background: '#fff', padding: '0.8rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hạn mức tối đa ({estimate.maxAdvancePercent}%)</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#475569', marginTop: '2px' }}>{formatCurrency(estimate.maxAdvanceAllowedTotal)} đ</div>
                    </div>
                    <div style={{ background: '#fff', padding: '0.8rem', borderRadius: 'var(--radius)', border: '1px solid #fecdd3' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>Còn được tạm ứng</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--danger)', marginTop: '2px' }}>{formatCurrency(estimate.remainingAdvanceAllowed)} đ</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px dashed #cbd5e1', paddingTop: '0.6rem' }}>
                    <span>Số lần đã tạm ứng trong khóa: <strong>{estimate.existingRequestCount} / {estimate.maxAdvanceTimes} lần</strong></span>
                    <span>Đã đề nghị/duyệt trước đó: <strong>{formatCurrency(estimate.totalPreviouslyRequested)} đ</strong></span>
                  </div>
                </div>
              ) : null}

              {/* Khoản giảm trừ kê khai */}
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <div className="flex justify-between items-center mb-2" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ margin: 0, fontWeight: 600 }}>
                    3. Khoản giảm trừ phát sinh (nếu có):
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {deductionCategories.slice(0, 3).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleAddDeduction(cat.id)}
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        + {cat.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleAddDeduction()}
                      style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      + Khoản khác
                    </button>
                  </div>
                </div>

                {selectedDeductions.length > 0 ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', background: '#fff' }}>
                    {selectedDeductions.map((d, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Tên khoản trừ..."
                          value={d.name}
                          onChange={(e) => {
                            const updated = [...selectedDeductions];
                            updated[index].name = e.target.value;
                            setSelectedDeductions(updated);
                          }}
                          required
                          style={{ flex: 2, minWidth: '180px', minHeight: '38px' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '140px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Số tiền"
                            value={d.amount ? formatCurrencyNumber(d.amount) : ''}
                            onChange={(e) => {
                              const updated = [...selectedDeductions];
                              updated[index].amount = parseCurrencyInput(e.target.value);
                              setSelectedDeductions(updated);
                            }}
                            required
                            style={{ textAlign: 'right', minHeight: '38px' }}
                          />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>đ</span>
                        </div>
                        <button
                          type="button"
                          className="action-btn btn-delete"
                          onClick={() => handleRemoveDeduction(index)}
                          title="Xóa khoản trừ này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)', marginTop: '6px' }}>
                      Tổng cộng các khoản giảm trừ: -{formatCurrency(calculateTotalDeductions())} đ
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.4rem 0' }}>
                    Chưa có khoản giảm trừ nào được kê khai.
                  </div>
                )}
              </div>

              {/* Lý do tạm ứng */}
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                  4. Lý do tạm ứng / Ghi chú gửi Kế toán:
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="VD: Tạm ứng đợt 1 xăng xe & chi phí giảng dạy..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ minHeight: '60px' }}
                ></textarea>
              </div>

              {/* Nút nộp đơn */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 2rem', fontWeight: 600, fontSize: '1rem', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  disabled={submitting || (estimate ? estimate.remainingAdvanceAllowed <= 0 : false)}
                >
                  <FilePlus size={18} />
                  {submitting ? 'Đang gửi yêu cầu...' : 'Nộp Đơn Đề Nghị Tạm Ứng'}
                </button>
              </div>
            </form>
          </div>

          {/* KHỐI 2: DANH SÁCH HỌC VIÊN PHỤ TRÁCH (FULL WIDTH) */}
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--primary)" /> Danh sách học viên phụ trách trong khóa ({estimate?.students?.length || 0})
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Bảng chi tiết học phí và thù lao giáo viên được hưởng trên từng học viên
            </p>

            {loadingEstimate ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Đang tải danh sách học viên...
              </div>
            ) : !estimate?.students || estimate.students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'var(--background)', borderRadius: 'var(--radius)' }}>
                Chưa có học viên nào được phân công cho bạn trong khóa này.
              </div>
            ) : (
              <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                      <th>Học viên</th>
                      <th>CCCD</th>
                      <th>Loại xe & Lịch học</th>
                      <th style={{ textAlign: 'right' }}>Mức học phí</th>
                      <th style={{ textAlign: 'center' }}>% Hưởng</th>
                      <th style={{ textAlign: 'right' }}>Thù lao GV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.students.map((st, i) => (
                      <tr key={st.id}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <strong>{st.name}</strong>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {st.cccd || '---'}
                        </td>
                        <td>
                          <span className={`badge ${st.transmissionType === 'AUTO' ? 'badge-primary' : 'badge-info'}`} style={{ marginRight: '6px' }}>
                            {st.transmissionType === 'AUTO' ? 'Số tự động' : 'Số sàn'}
                          </span>
                          <span className="badge" style={{ background: st.scheduleType === 'SUNDAY' ? '#fef2f2' : '#f1f5f9', color: st.scheduleType === 'SUNDAY' ? '#b91c1c' : '#334155', border: st.scheduleType === 'SUNDAY' ? '1px solid #fecaca' : 'none' }}>
                            {st.scheduleType === 'SUNDAY' ? 'Cuối tuần (T7, CN)' : 'Ngày thường (T2 - T6)'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(st.tuitionAmount)} đ
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>
                          {st.teacherSharePercent}%
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                          {formatCurrency(st.earnedAmount)} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td colSpan={4} style={{ textAlign: 'right' }}>TỔNG CỘNG THÙ LAO:</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(estimate.students.reduce((s, x) => s + (x.tuitionAmount || 0), 0))} đ
                      </td>
                      <td style={{ textAlign: 'center' }}>---</td>
                      <td style={{ textAlign: 'right', color: 'var(--success)', fontSize: '1.05rem' }}>
                        {formatCurrency(estimate.grossEstimatedAmount)} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* KHỐI 3: LỊCH SỬ CÁC ĐƠN ĐỀ NGHỊ TẠM ỨNG (FULL WIDTH) */}
          <div className="card" style={{ width: '100%' }}>
            <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={20} color="var(--primary)" /> Lịch sử Đơn Đề Nghị Tạm Ứng ({history.length})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px', marginBottom: 0 }}>
                  Theo dõi tiến độ duyệt chi và xem lý do phản hồi từ phòng Kế toán
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => user?.id && fetchHistory(user.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.8rem' }}
              >
                <RefreshCw size={13} className={loadingHistory ? 'spin' : ''} /> Cập nhật
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Đang tải lịch sử...
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'var(--background)', borderRadius: 'var(--radius)' }}>
                Bạn chưa nộp phiếu đăng ký tạm ứng nào.
              </div>
            ) : (
              <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khóa học</th>
                      <th>Ngày nộp</th>
                      <th style={{ textAlign: 'right' }}>Số tiền đề nghị</th>
                      <th style={{ textAlign: 'right' }}>Số tiền duyệt</th>
                      <th style={{ textAlign: 'center' }}>Trạng thái</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{req.requestCode}</strong>
                        </td>
                        <td>
                          <strong>{req.course.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.studentCount} học viên</div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {new Date(req.createdAt).toLocaleDateString('vi-VN')} {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(req.requestedAmount)} đ
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                          {req.approvedAmount !== undefined && req.approvedAmount !== null
                            ? `${formatCurrency(req.approvedAmount)} đ`
                            : '---'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {getStatusBadge(req.status)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setViewRequest(req)}
                              title="Xem chi tiết"
                            >
                              <Eye size={12} /> Chi tiết
                            </button>
                            {req.status === 'PENDING' && (
                              <button
                                className="btn btn-danger"
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={() => handleDeleteDraft(req.id)}
                                title="Hủy đơn này"
                              >
                                Hủy đơn
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Xem chi tiết Phiếu tạm ứng */}
        {viewRequest && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1050,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={() => setViewRequest(null)}
          >
            <div
              className="card"
              style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={20} color="var(--primary)" /> Chi tiết Phiếu: {viewRequest.requestCode}
                </h3>
                <button
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setViewRequest(null)}
                >
                  &times;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="flex justify-between items-center" style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Trạng thái đơn:</span>
                  <div>{getStatusBadge(viewRequest.status)}</div>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Khóa học:</span>
                  <strong>{viewRequest.course.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Số lượng học viên:</span>
                  <span>{viewRequest.studentCount} học viên</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Số tiền đề nghị:</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{formatCurrency(viewRequest.requestedAmount)} VNĐ</strong>
                </div>

                {viewRequest.approvedAmount !== undefined && viewRequest.approvedAmount !== null && (
                  <div className="flex justify-between" style={{ background: '#f0fdf4', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius)', border: '1px solid #bbf7d0' }}>
                    <span style={{ color: '#166534', fontWeight: 600 }}>Số tiền Kế toán duyệt:</span>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--success)' }}>{formatCurrency(viewRequest.approvedAmount)} VNĐ</strong>
                  </div>
                )}

                {viewRequest.paymentReference && (
                  <div style={{ background: '#eff6ff', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius)', border: '1px solid #bfdbfe' }}>
                    <strong style={{ color: '#1e40af' }}>Mã giao dịch / UNC chi tiền:</strong>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.05rem', marginTop: '2px' }}>{viewRequest.paymentReference}</div>
                  </div>
                )}

                {viewRequest.reason && (
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Lý do tạm ứng:</strong>
                    <div style={{ marginTop: '3px', background: 'var(--background)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)' }}>{viewRequest.reason}</div>
                  </div>
                )}

                {viewRequest.deductions && viewRequest.deductions.length > 0 && (
                  <div style={{ background: '#fff1f2', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid #fecdd3' }}>
                    <strong style={{ color: '#9f1239' }}>Khoản giảm trừ đi kèm:</strong>
                    <ul style={{ margin: '0.4rem 0 0 1.2rem', fontSize: '0.9rem', color: '#881337' }}>
                      {viewRequest.deductions.map(d => (
                        <li key={d.id}>{d.name}: -{formatCurrency(d.amount)} đ</li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewRequest.accountantNotes && (
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <strong style={{ color: 'var(--text-muted)' }}>Ý kiến phản hồi của Kế toán:</strong>
                    <div style={{ marginTop: '4px', fontSize: '0.9rem', color: '#0f172a' }}>{viewRequest.accountantNotes}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setViewRequest(null)}>Đóng</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
