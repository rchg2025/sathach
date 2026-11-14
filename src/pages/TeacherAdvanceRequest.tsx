import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, FilePlus, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';

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
      const courseList = res.data?.courses || res.data || [];
      setCourses(courseList);
      if (courseList.length > 0) {
        setSelectedCourseId(courseList[0].id);
        fetchEstimate(teacherId, courseList[0].id);
      }
    } catch (e) {
      console.error('Lỗi tải khóa học', e);
    }
  };

  const fetchDeductionCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/deduction-categories`);
      setDeductionCategories(res.data?.filter((d: any) => d.isActive) || []);
    } catch (e) {
      console.error('Lỗi tải danh mục trừ', e);
    }
  };

  const fetchEstimate = async (tId: number, cId: number) => {
    setLoadingEstimate(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/advance-estimate?teacherId=${tId}&courseId=${cId}`);
      setEstimate(res.data);
      if (res.data?.remainingAdvanceAllowed > 0) {
        setRequestedAmount(res.data.remainingAdvanceAllowed);
      } else {
        setRequestedAmount(0);
      }
    } catch (e: any) {
      toast.error('Lỗi lấy thông tin ước tính học viên');
    } finally {
      setLoadingEstimate(false);
    }
  };

  const fetchHistory = async (teacherId: number) => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/advance-requests?teacherId=${teacherId}`);
      setHistory(res.data || []);
    } catch (e) {
      console.error('Lỗi tải lịch sử tạm ứng', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCourseChange = (cId: number) => {
    setSelectedCourseId(cId);
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
          { deductionCategoryId: cat.id, name: cat.name, amount: cat.defaultAmount || 0, note: '' }
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
    return selectedDeductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !user?.id) {
      toast.error('Vui lòng chọn khóa học');
      return;
    }

    if (!requestedAmount || requestedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền tạm ứng hợp lệ');
      return;
    }

    if (estimate && requestedAmount > estimate.remainingAdvanceAllowed) {
      toast.error(`Số tiền đề nghị vượt quá hạn mức tối đa còn lại (${formatCurrency(estimate.remainingAdvanceAllowed)} đ)`);
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

  return (
    <AdminLayout user={user}>
      <div>
        <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <CreditCard size={24} color="var(--primary)" /> Đăng ký Tạm ứng Thù lao
          </h2>
          <button
            className="btn btn-secondary"
            onClick={() => user?.id && selectedCourseId && fetchEstimate(user.id, selectedCourseId)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <RefreshCw size={14} className={loadingEstimate ? 'spin' : ''} /> Làm mới
          </button>
        </div>

        {/* Thông báo quy định */}
        {estimate?.policyGuidelines && (
          <div className="card" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd', marginBottom: '1.5rem', padding: '1rem' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* CỘT TRÁI: FORM ĐĂNG KÝ */}
          <div>
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FilePlus size={18} color="var(--primary)" /> Lập Đơn Đề nghị Tạm ứng
              </h3>

              <form onSubmit={handleSubmitRequest}>
                {/* 1. Chọn khóa */}
                <div className="form-group">
                  <label>1. Chọn Khóa học:</label>
                  <select
                    className="form-control"
                    value={selectedCourseId || ''}
                    onChange={(e) => handleCourseChange(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Thống kê số liệu */}
                {loadingEstimate ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    Đang tính toán học viên & thù lao...
                  </div>
                ) : estimate ? (
                  <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Số học viên</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{estimate.studentCount} HV</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng thù lao</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(estimate.grossEstimatedAmount)} đ</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hạn mức ({estimate.maxAdvancePercent}%)</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(estimate.maxAdvanceAllowedTotal)} đ</div>
                      </div>
                    </div>
                    <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border)' }} />
                    <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Đã đề nghị/duyệt: <strong>{formatCurrency(estimate.totalPreviouslyRequested)} đ</strong></span>
                      <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Còn lại: {formatCurrency(estimate.remainingAdvanceAllowed)} đ</span>
                    </div>
                  </div>
                ) : null}

                {/* 3. Số tiền đề nghị */}
                <div className="form-group">
                  <label>2. Số tiền đề nghị tạm ứng <span style={{ color: 'var(--danger)' }}>*</span>:</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    min={100000}
                    max={estimate?.remainingAdvanceAllowed || undefined}
                    value={requestedAmount || ''}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    required
                    style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }}
                  />
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Bằng chữ: <em>{formatCurrency(requestedAmount)} đồng</em>
                  </div>
                </div>

                {/* 4. Khoản giảm trừ */}
                <div className="form-group">
                  <div className="flex justify-between items-center mb-2">
                    <label style={{ margin: 0 }}>3. Khoản giảm trừ phát sinh (nếu có):</label>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleAddDeduction()}
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    >
                      + Thêm khoản trừ
                    </button>
                  </div>

                  {selectedDeductions.length > 0 ? (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem', background: '#fff' }}>
                      {selectedDeductions.map((d, index) => (
                        <div key={index} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
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
                            style={{ flex: 2 }}
                          />
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Số tiền"
                            value={d.amount || ''}
                            onChange={(e) => {
                              const updated = [...selectedDeductions];
                              updated[index].amount = Number(e.target.value);
                              setSelectedDeductions(updated);
                            }}
                            required
                            style={{ flex: 1, textAlign: 'right' }}
                          />
                          <button
                            type="button"
                            className="action-btn btn-delete"
                            onClick={() => handleRemoveDeduction(index)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger)', marginTop: '4px' }}>
                        Tổng khoản trừ: -{formatCurrency(calculateTotalDeductions())} đ
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Không có khoản trừ nào được kê khai.
                    </div>
                  )}
                </div>

                {/* 5. Lý do */}
                <div className="form-group">
                  <label>4. Lý do tạm ứng / Ghi chú gửi Kế toán:</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="VD: Tạm ứng đợt 1 xăng xe & chi phí giảng dạy..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontWeight: 600, marginTop: '0.5rem' }}
                  disabled={submitting || (estimate ? estimate.remainingAdvanceAllowed <= 0 : false)}
                >
                  {submitting ? 'Đang gửi yêu cầu...' : 'Nộp Đơn Đề Nghị Tạm Ứng'}
                </button>
              </form>
            </div>

            {/* Danh sách học viên */}
            {estimate?.students && estimate.students.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                  Danh sách {estimate.students.length} học viên của bạn trong khóa
                </h3>
                <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', maxHeight: '300px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>STT</th>
                        <th>Học viên</th>
                        <th>Loại xe & Lịch</th>
                        <th style={{ textAlign: 'right' }}>Học phí</th>
                        <th style={{ textAlign: 'center' }}>% Hưởng</th>
                        <th style={{ textAlign: 'right' }}>Thù lao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimate.students.map((st, i) => (
                        <tr key={st.id}>
                          <td>{i + 1}</td>
                          <td>
                            <strong>{st.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CCCD: {st.cccd}</div>
                          </td>
                          <td>
                            <span className={`badge ${st.transmissionType === 'AUTO' ? 'badge-primary' : 'badge-info'}`} style={{ marginRight: '4px' }}>
                              {st.transmissionType === 'AUTO' ? 'Số tự động' : 'Số sàn'}
                            </span>
                            <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                              {st.scheduleType === 'SUNDAY' ? 'Chủ nhật' : 'Ngày thường'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(st.tuitionAmount)} đ</td>
                          <td style={{ textAlign: 'center' }}>{st.teacherSharePercent}%</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                            {formatCurrency(st.earnedAmount)} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: LỊCH SỬ ĐƠN TẠM ỨNG */}
          <div>
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                  Lịch sử Đơn Tạm ứng ({history.length})
                </h3>
                <button className="btn btn-secondary" onClick={() => user?.id && fetchHistory(user.id)} style={{ padding: '4px 8px' }}>
                  <RefreshCw size={12} className={loadingHistory ? 'spin' : ''} />
                </button>
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Bạn chưa nộp phiếu đăng ký tạm ứng nào.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {history.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: '1rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        background: '#fff',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s',
                      }}
                      onClick={() => setViewRequest(req)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <strong style={{ color: 'var(--primary)' }}>{req.requestCode}</strong>
                        {getStatusBadge(req.status)}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{req.course.name}</div>
                      <div className="flex justify-between items-center mt-2" style={{ fontSize: '0.85rem' }}>
                        <span>Đề nghị: <strong>{formatCurrency(req.requestedAmount)} đ</strong></span>
                        {req.approvedAmount !== undefined && req.approvedAmount !== null && (
                          <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                            Duyệt: {formatCurrency(req.approvedAmount)} đ
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Ngày nộp: {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        {req.status === 'PENDING' && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDraft(req.id);
                            }}
                          >
                            Hủy đơn
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            }}
            onClick={() => setViewRequest(null)}
          >
            <div
              className="card"
              style={{ width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Chi tiết Phiếu: {viewRequest.requestCode}</h3>
                <button
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setViewRequest(null)}
                >
                  &times;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>
                  <div>{getStatusBadge(viewRequest.status)}</div>
                </div>
                <div><strong>Khóa học:</strong> {viewRequest.course.name}</div>
                <div><strong>Số lượng học viên phụ trách:</strong> {viewRequest.studentCount} HV</div>
                <div><strong>Số tiền đề nghị:</strong> {formatCurrency(viewRequest.requestedAmount)} VNĐ</div>
                {viewRequest.approvedAmount !== undefined && viewRequest.approvedAmount !== null && (
                  <div style={{ color: 'var(--success)' }}>
                    <strong>Số tiền Kế toán duyệt:</strong> {formatCurrency(viewRequest.approvedAmount)} VNĐ
                  </div>
                )}
                {viewRequest.paymentReference && (
                  <div style={{ color: 'var(--primary)' }}>
                    <strong>Mã giao dịch / UNC chi tiền:</strong> {viewRequest.paymentReference}
                  </div>
                )}
                {viewRequest.reason && (
                  <div><strong>Lý do tạm ứng:</strong> {viewRequest.reason}</div>
                )}
                {viewRequest.deductions && viewRequest.deductions.length > 0 && (
                  <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                    <strong>Khoản giảm trừ:</strong>
                    <ul style={{ margin: '0.5rem 0 0 1.2rem', fontSize: '0.85rem' }}>
                      {viewRequest.deductions.map(d => (
                        <li key={d.id}>{d.name}: -{formatCurrency(d.amount)} đ</li>
                      ))}
                    </ul>
                  </div>
                )}
                {viewRequest.accountantNotes && (
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <strong style={{ color: 'var(--text-muted)' }}>Ý kiến phản hồi của Kế toán:</strong>
                    <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>{viewRequest.accountantNotes}</div>
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
