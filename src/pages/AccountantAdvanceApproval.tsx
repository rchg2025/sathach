import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, CheckCircle2, XCircle, Clock, RefreshCw, Eye, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';

const API_BASE_URL = '';

interface AdvanceRequest {
  id: number;
  requestCode: string;
  teacherId: number;
  teacher: { id: number; name: string; username: string; phone?: string };
  courseId: number;
  course: { id: number; name: string };
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
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  deductions: Array<{ id: number; name: string; amount: number; note?: string }>;
}

export default function AccountantAdvanceApproval() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Action modal state
  const [selectedRequest, setSelectedRequest] = useState<AdvanceRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'PAY' | 'VIEW' | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [accountantNotes, setAccountantNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const uStr = localStorage.getItem('user');
    if (uStr) setUser(JSON.parse(uStr));
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/advance-requests?status=${statusFilter}`);
      setRequests(res.data || []);
    } catch (e) {
      console.error('Lỗi tải danh sách yêu cầu tạm ứng', e);
      toast.error('Lỗi tải danh sách yêu cầu tạm ứng');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (req: AdvanceRequest, type: 'APPROVE' | 'REJECT' | 'PAY' | 'VIEW') => {
    setSelectedRequest(req);
    setActionType(type);
    setApprovedAmount(req.approvedAmount !== undefined && req.approvedAmount !== null ? req.approvedAmount : req.requestedAmount);
    setAccountantNotes(req.accountantNotes || '');
    setPaymentReference(req.paymentReference || '');
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
    setActionType(null);
  };

  const handleProcessAction = async () => {
    if (!selectedRequest || !actionType || actionType === 'VIEW') return;

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/manager/finance/advance-requests/${selectedRequest.id}/action`, {
        action: actionType,
        approvedAmount: actionType === 'APPROVE' || actionType === 'PAY' ? Number(approvedAmount) : undefined,
        accountantNotes,
        paymentReference: actionType === 'PAY' ? paymentReference : undefined,
        accountantName: user?.name || user?.username || 'Kế toán',
      });

      const actionMsg =
        actionType === 'APPROVE'
          ? 'Đã duyệt yêu cầu tạm ứng!'
          : actionType === 'PAY'
          ? 'Đã xác nhận chi tiền thành công!'
          : 'Đã từ chối đơn tạm ứng';

      toast.success(actionMsg);
      handleCloseModal();
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi xử lý yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Chờ duyệt</span>;
      case 'APPROVED':
        return <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Đã duyệt (Chờ chi)</span>;
      case 'PAID':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Đã chi tiền</span>;
      case 'REJECTED':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Từ chối</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const filteredRequests = requests.filter(r => {
    const kw = searchKeyword.toLowerCase().trim();
    if (!kw) return true;
    return (
      r.requestCode.toLowerCase().includes(kw) ||
      r.teacher?.name.toLowerCase().includes(kw) ||
      r.teacher?.username.toLowerCase().includes(kw) ||
      r.course?.name.toLowerCase().includes(kw)
    );
  });

  return (
    <AdminLayout user={user}>
      <div>
        <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <DollarSign size={24} color="var(--primary)" /> Quản lý Duyệt Tạm ứng & Chi tiền
          </h2>
          <button
            className="btn btn-secondary"
            onClick={fetchRequests}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới
          </button>
        </div>

        {/* Bộ lọc */}
        <div className="card mb-4">
          <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Tìm theo mã phiếu, tên giáo viên, khóa học..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ flex: 1, minWidth: '220px' }}
              />
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ duyệt (Mới)</option>
                <option value="APPROVED">Đã duyệt (Chờ chi)</option>
                <option value="PAID">Đã chi tiền</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danh sách yêu cầu */}
        <div className="card">
          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Mã phiếu</th>
                  <th>Giáo viên</th>
                  <th>Khóa học</th>
                  <th style={{ textAlign: 'center' }}>Học viên</th>
                  <th style={{ textAlign: 'right' }}>Đề nghị</th>
                  <th style={{ textAlign: 'right' }}>Duyệt chi</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'center', width: '160px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Đang tải danh sách yêu cầu tạm ứng...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Không tìm thấy đơn đề nghị tạm ứng nào.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id}>
                      <td><strong style={{ color: 'var(--primary)' }}>{req.requestCode}</strong></td>
                      <td>
                        <strong>{req.teacher?.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{req.teacher?.username}</div>
                      </td>
                      <td>{req.course?.name}</td>
                      <td style={{ textAlign: 'center' }}><strong>{req.studentCount}</strong> HV</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(req.requestedAmount)} đ</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {req.approvedAmount !== undefined && req.approvedAmount !== null ? `${formatCurrency(req.approvedAmount)} đ` : '-'}
                      </td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                            onClick={() => handleOpenAction(req, 'VIEW')}
                            title="Xem chi tiết"
                          >
                            <Eye size={13} />
                          </button>

                          {req.status === 'PENDING' && (
                            <>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                                onClick={() => handleOpenAction(req, 'APPROVE')}
                                title="Duyệt đơn"
                              >
                                <Check size={13} /> Duyệt
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                                onClick={() => handleOpenAction(req, 'REJECT')}
                                title="Từ chối"
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}

                          {req.status === 'APPROVED' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                              onClick={() => handleOpenAction(req, 'PAY')}
                              title="Xác nhận chi tiền"
                            >
                              <DollarSign size={13} /> Chi tiền
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Xử lý / Xem chi tiết */}
        {selectedRequest && actionType && (
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
            onClick={handleCloseModal}
          >
            <div
              className="card"
              style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                  {actionType === 'APPROVE' && 'Phê duyệt Đơn Tạm ứng'}
                  {actionType === 'PAY' && 'Xác nhận Chi tiền Tạm ứng'}
                  {actionType === 'REJECT' && 'Từ chối Đơn Tạm ứng'}
                  {actionType === 'VIEW' && `Chi tiết Phiếu: ${selectedRequest.requestCode}`}
                </h3>
                <button
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={handleCloseModal}
                >
                  &times;
                </button>
              </div>

              {/* Thông tin đơn */}
              <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div><strong>Mã phiếu:</strong> {selectedRequest.requestCode}</div>
                <div><strong>Trạng thái:</strong> {getStatusBadge(selectedRequest.status)}</div>
                <div><strong>Giáo viên:</strong> {selectedRequest.teacher?.name} (@{selectedRequest.teacher?.username})</div>
                <div><strong>Khóa học:</strong> {selectedRequest.course?.name}</div>
                <div><strong>Số học viên:</strong> {selectedRequest.studentCount} HV</div>
                <div><strong>Tổng thù lao ước tính:</strong> {formatCurrency(selectedRequest.grossEstimatedAmount)} đ</div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>Số tiền GV đề nghị:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatCurrency(selectedRequest.requestedAmount)} VNĐ</span>
                </div>
                {selectedRequest.reason && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Lý do GV đề nghị:</strong> {selectedRequest.reason}
                  </div>
                )}
              </div>

              {/* Chi tiết khoản trừ */}
              {selectedRequest.deductions && selectedRequest.deductions.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <strong>Các khoản giảm trừ kê khai:</strong>
                  <ul style={{ margin: '0.25rem 0 0 1.2rem', fontSize: '0.85rem' }}>
                    {selectedRequest.deductions.map(d => (
                      <li key={d.id}>{d.name}: -{formatCurrency(d.amount)} đ</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* FORM XỬ LÝ NẾU APPROVE HOẶC PAY */}
              {(actionType === 'APPROVE' || actionType === 'PAY') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label>Số tiền duyệt chi thực tế (VNĐ) <span style={{ color: 'var(--danger)' }}>*</span>:</label>
                    <input
                      type="number"
                      className="form-control"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(Number(e.target.value))}
                      style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)' }}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Bằng chữ: <em>{formatCurrency(approvedAmount)} đồng</em>
                    </div>
                  </div>

                  {actionType === 'PAY' && (
                    <div className="form-group">
                      <label>Mã giao dịch / Số ủy nhiệm chi (UNC) ngân hàng:</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="VD: FT26048123456 / UNC-00123"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Ghi chú / Ý kiến của Kế toán:</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Ý kiến hoặc lưu ý gửi cho giáo viên..."
                      value={accountantNotes}
                      onChange={(e) => setAccountantNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              )}

              {/* FORM NẾU REJECT */}
              {actionType === 'REJECT' && (
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label>Lý do từ chối đơn tạm ứng <span style={{ color: 'var(--danger)' }}>*</span>:</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Vui lòng nêu rõ lý do từ chối (VD: Vượt quá hạn mức khóa học, sai thông tin học viên...)"
                    value={accountantNotes}
                    onChange={(e) => setAccountantNotes(e.target.value)}
                    required
                  ></textarea>
                </div>
              )}

              {/* FOOTER */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={handleCloseModal} disabled={submitting}>
                  {actionType === 'VIEW' ? 'Đóng' : 'Hủy bỏ'}
                </button>

                {actionType !== 'VIEW' && (
                  <button
                    className={`btn ${actionType === 'REJECT' ? 'btn-danger' : actionType === 'PAY' ? 'btn-success' : 'btn-primary'}`}
                    onClick={handleProcessAction}
                    disabled={submitting}
                  >
                    {submitting ? 'Đang xử lý...' : actionType === 'APPROVE' ? 'Xác nhận Duyệt' : actionType === 'PAY' ? 'Xác nhận Chi tiền' : 'Xác nhận Từ chối'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
