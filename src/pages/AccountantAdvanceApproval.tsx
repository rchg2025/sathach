import { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { DollarSign, CheckCircle2, XCircle, Clock, RefreshCw, Eye, Check, X, CreditCard, Plus, Trash2, Award, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { numberToWordsVietnamese, formatCurrencyNumber, parseCurrencyInput } from '../utils/currencyUtils';
import PrintFinanceDocument, { type AdvanceRequestPrintData, type SettlementPrintData } from '../components/PrintFinanceDocument';

const API_BASE_URL = '';

interface AdvanceStudentItem {
  id: number;
  name: string;
  cccd: string;
  transmissionType: string;
  scheduleType: string;
  tuitionAmount: number;
  teacherSharePercent: number;
  earnedAmount: number;
}

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
  totalTuitionAmount?: number;
  students?: AdvanceStudentItem[];
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

interface SettlementSummaryItem {
  teacher: { id: number; name: string; username: string; phone?: string };
  course: { id: number; name: string; startDate?: string; endDate?: string };
  studentCount: number;
  totalTuition: number;
  grossEarned: number;
  totalAdvancePaid: number;
  totalAdvancePendingOrApproved: number;
  totalSettledPaid: number;
  remainingToPay: number;
  isFullySettled: boolean;
  advanceRequests: AdvanceRequest[];
  settlementRequests: AdvanceRequest[];
  students: AdvanceStudentItem[];
}

interface DeductionCategory {
  id: number;
  name: string;
  code?: string;
  defaultAmount: number;
}

interface CourseItem {
  id: number;
  name: string;
}

interface NewDeductionItem {
  deductionCategoryId?: number;
  name: string;
  amount: number;
  note?: string;
}

export default function AccountantAdvanceApproval() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ADVANCE' | 'SETTLEMENT'>('ADVANCE');
  const [courses, setCourses] = useState<CourseItem[]>([]);

  // Tab 1: Advance Requests state
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Tab 2: Settlement state
  const [settlementList, setSettlementList] = useState<SettlementSummaryItem[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [settlementSearch, setSettlementSearch] = useState('');
  const [settlementCourseFilter, setSettlementCourseFilter] = useState<string>('ALL');
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>('ALL');
  const [categories, setCategories] = useState<DeductionCategory[]>([]);

  // Advance Action Modal
  const [selectedRequest, setSelectedRequest] = useState<AdvanceRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'PAY' | 'VIEW' | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [accountantNotes, setAccountantNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Settlement Modal State
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementSummaryItem | null>(null);
  const [settlementDeductions, setSettlementDeductions] = useState<NewDeductionItem[]>([]);
  const [settlementPaymentRef, setSettlementPaymentRef] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [customPayAmount, setCustomPayAmount] = useState<number>(0);
  const [useCustomPayAmount, setUseCustomPayAmount] = useState<boolean>(false);
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  // In ấn Print state
  const [printDocType, setPrintDocType] = useState<'ADVANCE_REQUEST' | 'SETTLEMENT' | null>(null);
  const [printAdvanceData, setPrintAdvanceData] = useState<AdvanceRequestPrintData | null>(null);
  const [printSettlementData, setPrintSettlementData] = useState<SettlementPrintData | null>(null);

  useEffect(() => {
    const uStr = localStorage.getItem('user');
    if (uStr) setUser(JSON.parse(uStr));
    fetchCourses();
    fetchRequests();
    fetchDeductionCategories();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'SETTLEMENT') {
      fetchSettlementSummary();
    }
  }, [activeTab]);

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/courses`);
      const courseList: CourseItem[] = res.data?.courses || res.data || [];
      courseList.sort((a, b) => b.id - a.id);
      setCourses(courseList);
    } catch (e) {
      console.error('Lỗi tải danh sách khóa học', e);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/advance-requests?status=${statusFilter}`);
      setRequests(res.data || []);
    } catch (e) {
      console.error('Lỗi tải danh sách yêu cầu tạm ứng', e);
      toast.error('Lỗi tải danh sách yêu cầu tạm ứng');
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSettlementSummary = async () => {
    setLoadingSettlements(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/settlement-summary`);
      setSettlementList(res.data || []);
    } catch (e) {
      console.error('Lỗi tải dữ liệu quyết toán', e);
      toast.error('Lỗi tải danh sách quyết toán khóa học');
    } finally {
      setLoadingSettlements(false);
    }
  };

  const fetchDeductionCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/finance/deduction-categories`);
      setCategories(res.data || []);
    } catch (e) {
      console.error('Lỗi tải danh mục khoản trừ', e);
    }
  };

  const handleOpenAction = (req: AdvanceRequest, type: 'APPROVE' | 'REJECT' | 'PAY' | 'VIEW') => {
    setSelectedRequest(req);
    setActionType(type);

    let initialAmount = 0;
    if (req.approvedAmount !== undefined && req.approvedAmount !== null) {
      initialAmount = req.approvedAmount;
    } else {
      const totalDed = (req.deductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      initialAmount = Math.max(0, req.requestedAmount - totalDed);
    }

    setApprovedAmount(initialAmount);
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
      if (activeTab === 'SETTLEMENT') fetchSettlementSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi xử lý yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal thanh toán quyết toán cuối khóa
  const handleOpenSettlementModal = (item: SettlementSummaryItem) => {
    setSelectedSettlement(item);
    setSettlementDeductions([]);
    setSettlementPaymentRef('');
    setSettlementNotes(`Thanh toán quyết toán thù lao kết thúc khóa ${item.course.name}`);
    setUseCustomPayAmount(false);
    setCustomPayAmount(item.remainingToPay);
  };

  const handleCloseSettlementModal = () => {
    setSelectedSettlement(null);
    setSettlementDeductions([]);
  };

  // Thêm khoản giảm trừ
  const handleAddDeduction = () => {
    const firstCat = categories[0];
    setSettlementDeductions([
      ...settlementDeductions,
      {
        deductionCategoryId: firstCat ? firstCat.id : undefined,
        name: firstCat ? firstCat.name : '',
        amount: firstCat ? firstCat.defaultAmount : 0,
        note: ''
      }
    ]);
  };

  const handleRemoveDeduction = (idx: number) => {
    const updated = [...settlementDeductions];
    updated.splice(idx, 1);
    setSettlementDeductions(updated);
  };

  const handleDeductionChange = (idx: number, field: keyof NewDeductionItem, value: any) => {
    const updated = [...settlementDeductions];
    if (field === 'deductionCategoryId') {
      const catId = Number(value);
      const cat = categories.find(c => c.id === catId);
      updated[idx] = {
        ...updated[idx],
        deductionCategoryId: catId,
        name: cat ? cat.name : updated[idx].name,
        amount: cat ? cat.defaultAmount : updated[idx].amount
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setSettlementDeductions(updated);
  };

  // Tính toán số tiền thanh toán cuối khóa còn lại
  const totalSettlementDeductions = settlementDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const calculatedRemainingPay = selectedSettlement
    ? Math.max(0, selectedSettlement.remainingToPay - totalSettlementDeductions)
    : 0;
  const finalPayoutAmount = useCustomPayAmount ? customPayAmount : calculatedRemainingPay;

  // Xác nhận thực hiện thanh toán quyết toán cuối khóa
  const handleConfirmSettlementPayment = async () => {
    if (!selectedSettlement) return;

    if (finalPayoutAmount < 0) {
      toast.error('Số tiền thanh toán không được nhỏ hơn 0');
      return;
    }

    setSubmittingSettlement(true);
    try {
      await axios.post(`${API_BASE_URL}/api/manager/finance/settlement`, {
        teacherId: selectedSettlement.teacher.id,
        courseId: selectedSettlement.course.id,
        finalAmount: finalPayoutAmount,
        deductions: settlementDeductions,
        accountantNotes: settlementNotes,
        paymentReference: settlementPaymentRef,
        accountantName: user?.name || user?.username || 'Kế toán'
      });

      toast.success(`Đã thanh toán quyết toán thành công cho giáo viên ${selectedSettlement.teacher.name}!`);
      handleCloseSettlementModal();
      fetchSettlementSummary();
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi xử lý thanh toán cuối khóa');
    } finally {
      setSubmittingSettlement(false);
    }
  };

  // Hàm kích hoạt In đơn tạm ứng
  const handlePrintAdvance = async (req: AdvanceRequest) => {
    let students = req.students;

    // Nếu phiếu chưa có danh sách học viên, tự động tải từ endpoint estimate
    if (!students || students.length === 0) {
      try {
        const estRes = await axios.get(`${API_BASE_URL}/api/manager/finance/estimate`, {
          params: { teacherId: req.teacherId, courseId: req.courseId }
        });
        if (estRes.data?.students) {
          students = estRes.data.students;
        }
      } catch (err) {
        console.warn('Không tải được danh sách học viên bổ sung cho bản in:', err);
      }
    }

    setPrintSettlementData(null);
    setPrintDocType('ADVANCE_REQUEST');
    setPrintAdvanceData({
      requestCode: req.requestCode,
      createdAt: req.createdAt,
      teacher: req.teacher,
      course: req.course,
      studentCount: req.studentCount,
      grossEstimatedAmount: req.grossEstimatedAmount,
      totalTuitionAmount: req.totalTuitionAmount,
      requestedAmount: req.requestedAmount,
      approvedAmount: req.approvedAmount,
      totalDeductions: req.totalDeductions,
      status: req.status,
      reason: req.reason,
      accountantNotes: req.accountantNotes,
      paymentReference: req.paymentReference,
      approvedBy: req.approvedBy || user?.name || user?.username || 'Kế toán',
      approvedAt: req.approvedAt,
      paidAt: req.paidAt,
      deductions: req.deductions,
      students: students,
    });

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Hàm kích hoạt In quyết toán thanh toán
  const handlePrintSettlement = (item: SettlementSummaryItem, customAmount?: number, deductionsList?: NewDeductionItem[], paymentRef?: string, notes?: string) => {
    setPrintAdvanceData(null);
    setPrintDocType('SETTLEMENT');
    const finalAmt = customAmount !== undefined ? customAmount : (
      deductionsList ? Math.max(0, item.remainingToPay - deductionsList.reduce((s, d) => s + (Number(d.amount) || 0), 0)) : item.remainingToPay
    );

    setPrintSettlementData({
      requestCode: item.settlementRequests?.[0]?.requestCode,
      date: new Date().toISOString(),
      teacher: item.teacher,
      course: item.course,
      studentCount: item.studentCount,
      totalTuition: item.totalTuition,
      grossEarned: item.grossEarned,
      totalAdvancePaid: item.totalAdvancePaid,
      totalSettledPaid: item.totalSettledPaid,
      remainingToPay: item.remainingToPay,
      settlementDeductions: deductionsList ? deductionsList.map(d => ({ name: d.name, amount: d.amount, note: d.note })) : [],
      finalAmount: finalAmt,
      paymentReference: paymentRef || item.settlementRequests?.[0]?.paymentReference,
      accountantNotes: notes || item.settlementRequests?.[0]?.accountantNotes,
      accountantName: user?.name || user?.username || 'Kế toán',
      students: item.students,
      advanceHistory: item.advanceRequests.map(r => ({
        requestCode: r.requestCode,
        createdAt: r.createdAt,
        requestedAmount: r.requestedAmount,
        approvedAmount: r.approvedAmount,
        status: r.status
      }))
    });

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Superadmin quantri xóa đơn đề nghị
  const handleDeleteRequest = async (req: AdvanceRequest) => {
    if (!window.confirm(`Xác nhận xóa phiếu đề nghị tạm ứng ${req.requestCode} của giáo viên ${req.teacher?.name}? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/manager/finance/advance-requests/${req.id}`, {
        params: { username: user?.username }
      });
      toast.success(`Đã xóa phiếu ${req.requestCode} thành công`);
      fetchRequests();
      if (activeTab === 'SETTLEMENT') fetchSettlementSummary();
    } catch (err: any) {
      console.error('Lỗi khi xóa phiếu đề nghị tạm ứng', err);
      toast.error(err.response?.data?.error || 'Lỗi khi xóa phiếu đề nghị tạm ứng');
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
    // Lọc theo khóa học
    if (courseFilter !== 'ALL' && String(r.courseId) !== courseFilter) {
      return false;
    }

    const kw = searchKeyword.toLowerCase().trim();
    if (!kw) return true;
    return (
      r.requestCode.toLowerCase().includes(kw) ||
      r.teacher?.name.toLowerCase().includes(kw) ||
      r.teacher?.username.toLowerCase().includes(kw) ||
      r.course?.name.toLowerCase().includes(kw)
    );
  });

  const filteredSettlements = settlementList.filter(item => {
    // Lọc theo khóa học
    if (settlementCourseFilter !== 'ALL' && String(item.course.id) !== settlementCourseFilter) {
      return false;
    }

    // Lọc theo trạng thái quyết toán
    if (settlementStatusFilter === 'SETTLED' && !item.isFullySettled) {
      return false;
    }
    if (settlementStatusFilter === 'ADVANCING' && (item.isFullySettled || item.totalAdvancePaid === 0)) {
      return false;
    }
    if (settlementStatusFilter === 'NOT_SETTLED' && (item.isFullySettled || item.totalAdvancePaid > 0)) {
      return false;
    }

    const kw = settlementSearch.toLowerCase().trim();
    if (!kw) return true;
    return (
      item.teacher.name.toLowerCase().includes(kw) ||
      item.teacher.username.toLowerCase().includes(kw) ||
      item.course.name.toLowerCase().includes(kw)
    );
  });

  return (
    <AdminLayout user={user}>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .sidebar, .mobile-header, .navbar, .admin-sidebar { display: none !important; }
            .main-content { margin: 0 !important; width: 100% !important; padding: 0 !important; }
            body { background: white !important; margin: 0 !important; padding: 0 !important; }
            .container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
            .card { box-shadow: none !important; border: none !important; background: transparent !important; }
            html, body, #root, .admin-layout, .main-content { height: auto !important; overflow: visible !important; }
          }
          .print-only { display: none; }
        `}
      </style>
      <div>
        {/* HEADER & TABS */}
        <div className="no-print flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <DollarSign size={26} color="var(--primary)" /> Quản lý Tạm ứng & Thanh toán Thù lao
            </h2>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Phê duyệt các đợt tạm ứng và quyết toán thanh toán các khoản còn lại cho giáo viên khi kết thúc khóa học
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={activeTab === 'ADVANCE' ? fetchRequests : fetchSettlementSummary}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <RefreshCw size={14} className={(loadingRequests || loadingSettlements) ? 'spin' : ''} /> Làm mới
          </button>
        </div>

        {/* TAB BUTTONS */}
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'ADVANCE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '8px 16px' }}
            onClick={() => setActiveTab('ADVANCE')}
          >
            <Clock size={16} /> Danh sách Đơn tạm ứng
            {requests.filter(r => r.status === 'PENDING').length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.75rem' }}>
                {requests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            className={`btn ${activeTab === 'SETTLEMENT' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '8px 16px' }}
            onClick={() => setActiveTab('SETTLEMENT')}
          >
            <CreditCard size={16} /> Thanh toán / Quyết toán cuối khóa
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: DANH SÁCH ĐƠN TẠM ỨNG                              */}
        {/* ========================================================= */}
        {activeTab === 'ADVANCE' && (
          <div className="no-print">
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
                    style={{ flex: '1 1 200px', minWidth: '180px' }}
                  />
                  {/* Lọc Khóa học */}
                  <div style={{ minWidth: '180px', flex: '0 0 auto' }}>
                    <Select
                      options={[
                        { value: 'ALL', label: 'Tất cả khóa học' },
                        ...courses.map(c => ({ value: String(c.id), label: c.name }))
                      ]}
                      value={{
                        value: courseFilter,
                        label: courseFilter === 'ALL'
                          ? 'Tất cả khóa học'
                          : (courses.find(c => String(c.id) === courseFilter)?.name || courseFilter)
                      }}
                      onChange={(opt: any) => setCourseFilter(opt ? opt.value : 'ALL')}
                      isSearchable={true}
                      placeholder="Chọn khóa học..."
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
                  {/* Lọc Trạng thái */}
                  <div style={{ minWidth: '180px', flex: '0 0 auto' }}>
                    <Select
                      options={[
                        { value: 'ALL', label: 'Tất cả trạng thái' },
                        { value: 'PENDING', label: 'Chờ duyệt (Mới)' },
                        { value: 'APPROVED', label: 'Đã duyệt (Chờ chi)' },
                        { value: 'PAID', label: 'Đã chi tiền' },
                        { value: 'REJECTED', label: 'Từ chối' }
                      ]}
                      value={{
                        value: statusFilter,
                        label:
                          statusFilter === 'PENDING'
                            ? 'Chờ duyệt (Mới)'
                            : statusFilter === 'APPROVED'
                            ? 'Đã duyệt (Chờ chi)'
                            : statusFilter === 'PAID'
                            ? 'Đã chi tiền'
                            : statusFilter === 'REJECTED'
                            ? 'Từ chối'
                            : 'Tất cả trạng thái'
                      }}
                      onChange={(opt: any) => setStatusFilter(opt ? opt.value : 'ALL')}
                      isSearchable={true}
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
                      <th style={{ textAlign: 'right' }}>Học phí đóng</th>
                      <th style={{ textAlign: 'right' }}>Đề nghị</th>
                      <th style={{ textAlign: 'right' }}>Duyệt chi</th>
                      <th style={{ textAlign: 'right' }}>Còn lại</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th style={{ textAlign: 'center', width: '220px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRequests ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Đang tải danh sách yêu cầu tạm ứng...
                        </td>
                      </tr>
                    ) : filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Không tìm thấy đơn đề nghị tạm ứng nào.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => {
                        const effectiveDeducted = req.approvedAmount !== undefined && req.approvedAmount !== null ? req.approvedAmount : req.requestedAmount;
                        const remainingEarned = Math.max(0, (req.grossEstimatedAmount || 0) - effectiveDeducted);

                        return (
                          <tr key={req.id}>
                            <td>
                              <strong style={{ color: req.requestCode.startsWith('QT-') ? '#059669' : 'var(--primary)' }}>
                                {req.requestCode}
                              </strong>
                              {req.requestCode.startsWith('QT-') && (
                                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>[Quyết toán]</div>
                              )}
                            </td>
                            <td>
                              <strong>{req.teacher?.name}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{req.teacher?.username}</div>
                            </td>
                            <td>{req.course?.name}</td>
                            <td style={{ textAlign: 'center' }}><strong>{req.studentCount}</strong> HV</td>
                            <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-color)' }}>
                              {formatCurrency(req.totalTuitionAmount || 0)} đ
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(req.requestedAmount)} đ</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                              {req.approvedAmount !== undefined && req.approvedAmount !== null ? `${formatCurrency(req.approvedAmount)} đ` : '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#b45309' }}>
                              {formatCurrency(remainingEarned)} đ
                            </td>
                            <td>{getStatusBadge(req.status)}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleOpenAction(req, 'VIEW')}
                                  title="Xem chi tiết"
                                >
                                  <Eye size={14} />
                                  <span className="btn-action-text">Xem</span>
                                </button>

                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1e40af', borderColor: '#bfdbfe', background: '#eff6ff' }}
                                  onClick={() => handlePrintAdvance(req)}
                                  title="In phiếu đề nghị tạm ứng"
                                >
                                  <Printer size={14} />
                                  <span className="btn-action-text">In phiếu</span>
                                </button>

                                {req.status === 'PENDING' && (
                                  <>
                                    <button
                                      className="btn btn-primary"
                                      style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      onClick={() => handleOpenAction(req, 'APPROVE')}
                                      title="Duyệt đơn"
                                    >
                                      <Check size={14} />
                                      <span className="btn-action-text">Duyệt</span>
                                    </button>
                                    <button
                                      className="btn btn-danger"
                                      style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      onClick={() => handleOpenAction(req, 'REJECT')}
                                      title="Từ chối"
                                    >
                                      <X size={14} />
                                      <span className="btn-action-text">Từ chối</span>
                                    </button>
                                  </>
                                )}

                                {req.status === 'APPROVED' && (
                                  <button
                                    className="btn btn-success"
                                    style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => handleOpenAction(req, 'PAY')}
                                    title="Xác nhận chi tiền"
                                  >
                                    <DollarSign size={14} />
                                    <span className="btn-action-text">Chi tiền</span>
                                  </button>
                                )}

                                {user?.username === 'quantri' && (
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => handleDeleteRequest(req)}
                                    title="Xóa phiếu (Quyền Superadmin quantri)"
                                  >
                                    <Trash2 size={14} />
                                    <span className="btn-action-text">Xóa</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: QUYẾT TOÁN / THANH TOÁN CUỐI KHÓA CHO GIÁO VIÊN      */}
        {/* ========================================================= */}
        {activeTab === 'SETTLEMENT' && (
          <div className="no-print">
            <div className="card mb-4" style={{ background: '#f8fafc', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Award size={24} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--primary)' }}>Hướng dẫn Quyết toán & Thanh toán cuối khóa:</h4>
                  <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                    Dựa trên tổng thù lao từ học viên giáo viên phụ trách, hệ thống tự động đối soát với các khoản giáo viên đã tạm ứng trước đó.
                    Khi kết thúc khóa học, kế toán chọn <strong>"Thanh toán"</strong> để kê khai thêm các khoản giảm trừ phát sinh (xăng xe, cabin, vi phạm...) và xác nhận thanh toán số tiền thù lao còn lại cho giáo viên.
                  </div>
                </div>
              </div>
            </div>

            {/* Bộ lọc quyết toán */}
            <div className="card mb-4">
              <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="🔍 Tìm kiếm theo tên giáo viên hoặc tên khóa học..."
                    value={settlementSearch}
                    onChange={(e) => setSettlementSearch(e.target.value)}
                    style={{ flex: '1 1 200px', minWidth: '180px' }}
                  />
                  {/* Lọc Khóa học */}
                  <div style={{ minWidth: '180px', flex: '0 0 auto' }}>
                    <Select
                      options={[
                        { value: 'ALL', label: 'Tất cả khóa học' },
                        ...courses.map(c => ({ value: String(c.id), label: c.name }))
                      ]}
                      value={{
                        value: settlementCourseFilter,
                        label: settlementCourseFilter === 'ALL'
                          ? 'Tất cả khóa học'
                          : (courses.find(c => String(c.id) === settlementCourseFilter)?.name || settlementCourseFilter)
                      }}
                      onChange={(opt: any) => setSettlementCourseFilter(opt ? opt.value : 'ALL')}
                      isSearchable={true}
                      placeholder="Chọn khóa học..."
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
                  {/* Lọc Trạng thái quyết toán */}
                  <div style={{ minWidth: '180px', flex: '0 0 auto' }}>
                    <Select
                      options={[
                        { value: 'ALL', label: 'Tất cả trạng thái' },
                        { value: 'NOT_SETTLED', label: 'Chưa thanh toán' },
                        { value: 'ADVANCING', label: 'Đang tạm ứng' },
                        { value: 'SETTLED', label: 'Đã quyết toán' }
                      ]}
                      value={{
                        value: settlementStatusFilter,
                        label:
                          settlementStatusFilter === 'SETTLED'
                            ? 'Đã quyết toán'
                            : settlementStatusFilter === 'ADVANCING'
                            ? 'Đang tạm ứng'
                            : settlementStatusFilter === 'NOT_SETTLED'
                            ? 'Chưa thanh toán'
                            : 'Tất cả trạng thái'
                      }}
                      onChange={(opt: any) => setSettlementStatusFilter(opt ? opt.value : 'ALL')}
                      isSearchable={true}
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
                </div>
              </div>
            </div>

            {/* Bảng tổng hợp quyết toán */}
            <div className="card">
              <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Giáo viên</th>
                      <th>Khóa học</th>
                      <th style={{ textAlign: 'center' }}>Số HV</th>
                      <th style={{ textAlign: 'right' }}>Tổng học phí</th>
                      <th style={{ textAlign: 'right' }}>Tổng thù lao</th>
                      <th style={{ textAlign: 'right' }}>Đã tạm ứng</th>
                      <th style={{ textAlign: 'right' }}>Đã quyết toán</th>
                      <th style={{ textAlign: 'right' }}>Còn lại cần chi</th>
                      <th style={{ textAlign: 'center' }}>Trạng thái</th>
                      <th style={{ textAlign: 'center', width: '180px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingSettlements ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Đang tải danh sách tổng hợp quyết toán...
                        </td>
                      </tr>
                    ) : filteredSettlements.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Không tìm thấy dữ liệu giáo viên và khóa học nào cần thanh toán.
                        </td>
                      </tr>
                    ) : (
                      filteredSettlements.map((item, idx) => {
                        return (
                          <tr key={`${item.teacher.id}-${item.course.id}-${idx}`}>
                            <td>
                              <strong>{item.teacher.name}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{item.teacher.username}</div>
                            </td>
                            <td>
                              <strong>{item.course.name}</strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>
                                {item.studentCount} HV
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500 }}>
                              {formatCurrency(item.totalTuition)} đ
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                              {formatCurrency(item.grossEarned)} đ
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500, color: '#b45309' }}>
                              {formatCurrency(item.totalAdvancePaid)} đ
                              {item.totalAdvancePendingOrApproved > 0 && (
                                <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                                  (Chờ chi: {formatCurrency(item.totalAdvancePendingOrApproved)} đ)
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500, color: '#059669' }}>
                              {formatCurrency(item.totalSettledPaid)} đ
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1rem', color: item.remainingToPay > 0 ? '#b45309' : 'var(--text-muted)' }}>
                              {formatCurrency(item.remainingToPay)} đ
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.isFullySettled ? (
                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle2 size={12} /> Đã quyết toán
                                </span>
                              ) : item.totalAdvancePaid > 0 ? (
                                <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={12} /> Đang tạm ứng
                                </span>
                              ) : (
                                <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={12} /> Chưa thanh toán
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                  className={`btn ${item.remainingToPay > 0 ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{ padding: '5px 10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  onClick={() => handleOpenSettlementModal(item)}
                                >
                                  <CreditCard size={14} /> Thanh toán
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 8px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                                  onClick={() => handlePrintSettlement(item)}
                                  title="In bảng quyết toán thanh toán"
                                >
                                  <Printer size={14} />
                                  <span className="btn-action-text">In bảng</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: XỬ LÝ / XEM ĐƠN TẠM ỨNG (TAB 1)                  */}
        {/* ========================================================= */}
        {selectedRequest && actionType && (
          <div
            className="no-print"
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
              style={{ width: '95%', maxWidth: '950px', maxHeight: '92vh', overflowY: 'auto', padding: '1.5rem' }}
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
                <div><strong>Tổng học phí đóng:</strong> <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{formatCurrency(selectedRequest.totalTuitionAmount || 0)} đ</span></div>
                <div><strong>Tổng thù lao ước tính:</strong> {formatCurrency(selectedRequest.grossEstimatedAmount)} đ</div>
                <div>
                  <strong>Số tiền còn lại sau tạm ứng:</strong>{' '}
                  <span style={{ fontWeight: 'bold', color: '#b45309' }}>
                    {formatCurrency(
                      Math.max(
                        0,
                        (selectedRequest.grossEstimatedAmount || 0) -
                        ((actionType === 'APPROVE' || actionType === 'PAY') ? approvedAmount : (selectedRequest.approvedAmount !== undefined && selectedRequest.approvedAmount !== null ? selectedRequest.approvedAmount : selectedRequest.requestedAmount))
                      )
                    )} đ
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>Số tiền đề nghị:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatCurrency(selectedRequest.requestedAmount)} VNĐ</span>
                </div>
                {selectedRequest.paymentReference && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Mã giao dịch / UNC:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>{selectedRequest.paymentReference}</span>
                  </div>
                )}
                {selectedRequest.reason && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Lý do GV đề nghị:</strong> {selectedRequest.reason}
                  </div>
                )}
              </div>

              {/* Danh sách học viên */}
              <div style={{ marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', background: '#fff' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Danh sách học viên giáo viên phụ trách ({selectedRequest.students?.length || 0}):</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Tổng học phí: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(selectedRequest.totalTuitionAmount || 0)} đ</strong>
                  </span>
                </div>

                {(!selectedRequest.students || selectedRequest.students.length === 0) ? (
                  <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Chưa có dữ liệu học viên gắn với giáo viên trong khóa này.
                  </div>
                ) : (
                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <table className="table" style={{ margin: 0, fontSize: '0.88rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                        <tr>
                          <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                          <th style={{ minWidth: '160px' }}>Học viên</th>
                          <th style={{ minWidth: '130px' }}>CCCD</th>
                          <th style={{ minWidth: '180px' }}>Loại xe & Lịch</th>
                          <th style={{ textAlign: 'right', minWidth: '120px' }}>Học phí đóng</th>
                          <th style={{ textAlign: 'center', width: '70px' }}>%</th>
                          <th style={{ textAlign: 'right', minWidth: '120px' }}>Thù lao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.students.map((st, idx) => (
                          <tr key={st.id || idx}>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td><strong>{st.name}</strong></td>
                            <td style={{ fontFamily: 'monospace' }}>{st.cccd || '-'}</td>
                            <td>
                              <span style={{ fontSize: '0.75rem' }}>
                                {st.transmissionType === 'AUTO' ? 'Tự động' : 'Số sàn'} - {st.scheduleType === 'SUNDAY' ? 'Cuối tuần' : 'Ngày thường'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(st.tuitionAmount)} đ</td>
                            <td style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>{st.teacherSharePercent}%</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(st.earnedAmount)} đ</td>
                          </tr>
                        ))}

                        {/* CÁC KHOẢN GIẢM TRỪ ĐƯỢC ĐƯA VÀO BÊN TRONG BẢNG */}
                        {selectedRequest.deductions && selectedRequest.deductions.length > 0 && (
                          <>
                            <tr style={{ background: '#fffbeb', fontWeight: 600 }}>
                              <td colSpan={7} style={{ padding: '6px 10px', color: '#b45309', fontSize: '0.82rem' }}>
                                * CÁC KHOẢN GIẢM TRỪ THÊM KÊ KHAI CỦA GIÁO VIÊN:
                              </td>
                            </tr>
                            {selectedRequest.deductions.map((d, dIdx) => (
                              <tr key={`modal-ded-${d.id || dIdx}`} style={{ background: '#fff1f2', color: '#dc2626' }}>
                                <td style={{ textAlign: 'center' }}>-</td>
                                <td colSpan={5} style={{ paddingLeft: '15px' }}>
                                  Trừ: <strong>{d.name}</strong> {d.note ? `(${d.note})` : ''}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                  -{formatCurrency(d.amount)} đ
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                      <tfoot style={{ position: 'sticky', bottom: 0, background: '#f1f5f9', fontWeight: 'bold' }}>
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'right' }}>TỔNG THÙ LAO:</td>
                          <td style={{ textAlign: 'right', color: 'var(--primary)' }}>
                            {formatCurrency(selectedRequest.totalTuitionAmount || 0)} đ
                          </td>
                          <td style={{ textAlign: 'center' }}>-</td>
                          <td style={{ textAlign: 'right', color: 'var(--success)' }}>
                            {formatCurrency(selectedRequest.grossEstimatedAmount)} đ
                          </td>
                        </tr>
                        {selectedRequest.deductions && selectedRequest.deductions.length > 0 && (
                          <tr style={{ background: '#e2e8f0', color: '#15803d' }}>
                            <td colSpan={6} style={{ textAlign: 'right', fontSize: '0.9rem' }}>
                              TỔNG THÙ LAO THỰC TẾ (SAU KHOẢN TRỪ):
                            </td>
                            <td style={{ textAlign: 'right', fontSize: '0.95rem' }}>
                              {formatCurrency(
                                Math.max(
                                  0,
                                  selectedRequest.grossEstimatedAmount -
                                  selectedRequest.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0)
                                )
                              )} đ
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* FORM XỬ LÝ NẾU APPROVE HOẶC PAY */}
              {(actionType === 'APPROVE' || actionType === 'PAY') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label>Số tiền duyệt chi thực tế (VNĐ) <span style={{ color: 'var(--danger)' }}>*</span>:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formatCurrencyNumber(approvedAmount)}
                      onChange={(e) => setApprovedAmount(parseCurrencyInput(e.target.value))}
                      style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}
                    />
                    <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '4px', fontWeight: 500 }}>
                      Bằng chữ: <em>{numberToWordsVietnamese(approvedAmount)}</em>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1e40af', borderColor: '#bfdbfe', background: '#eff6ff' }}
                  onClick={() => handlePrintAdvance(selectedRequest)}
                >
                  <Printer size={16} /> In phiếu đề nghị
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: THANH TOÁN / QUYẾT TOÁN CUỐI KHÓA (TAB 2)        */}
        {/* ========================================================= */}
        {selectedSettlement && (
          <div
            className="no-print"
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
            onClick={handleCloseSettlementModal}
          >
            <div
              className="card"
              style={{ width: '95%', maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto', padding: '1.5rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                  <CreditCard size={22} /> Thanh toán Quyết toán Cuối khóa cho Giáo viên
                </h3>
                <button
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={handleCloseSettlementModal}
                >
                  &times;
                </button>
              </div>

              {/* TỔNG QUAN TÀI CHÍNH CỦA GIÁO VIÊN TRONG KHÓA */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div>
                    <strong>Giáo viên:</strong> <span style={{ fontSize: '1rem', color: 'var(--text-color)' }}>{selectedSettlement.teacher.name}</span> (@{selectedSettlement.teacher.username})
                  </div>
                  <div>
                    <strong>Khóa học:</strong> <span style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>{selectedSettlement.course.name}</span>
                  </div>
                  <div>
                    <strong>Số học viên phụ trách:</strong> <strong>{selectedSettlement.studentCount}</strong> học viên
                  </div>
                  <div>
                    <strong>Tổng học phí học viên đóng:</strong> <strong style={{ color: 'var(--text-color)' }}>{formatCurrency(selectedSettlement.totalTuition)} đ</strong>
                  </div>
                </div>

                <div style={{ margin: '0.75rem 0', borderTop: '1px dashed #cbd5e1' }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                  <div style={{ background: '#ecfdf5', padding: '0.5rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#065f46' }}>TỔNG THÙ LAO</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#047857' }}>{formatCurrency(selectedSettlement.grossEarned)} đ</div>
                  </div>
                  <div style={{ background: '#fffbeb', padding: '0.5rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#92400e' }}>ĐÃ TẠM ỨNG</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b45309' }}>-{formatCurrency(selectedSettlement.totalAdvancePaid)} đ</div>
                  </div>
                  <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>ĐÃ QUYẾT TOÁN</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1d4ed8' }}>-{formatCurrency(selectedSettlement.totalSettledPaid)} đ</div>
                  </div>
                  <div style={{ background: '#fdf2f8', padding: '0.5rem', borderRadius: '6px', border: '1px solid #fbcfe8' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9d174d' }}>CÒN LẠI CHƯA CHI</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#be185d' }}>{formatCurrency(selectedSettlement.remainingToPay)} đ</div>
                  </div>
                </div>
              </div>

              {/* LỊCH SỬ CÁC ĐỢT TẠM ỨNG TRƯỚC ĐÂY */}
              {selectedSettlement.advanceRequests && selectedSettlement.advanceRequests.length > 0 && (
                <div style={{ marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', color: '#475569' }}>
                    Lịch sử các đợt tạm ứng trong khóa ({selectedSettlement.advanceRequests.length} đợt):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                    {selectedSettlement.advanceRequests.map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f8fafc', borderRadius: '4px' }}>
                        <span>
                          <strong>{r.requestCode}</strong> - {new Date(r.createdAt).toLocaleDateString('vi-VN')} {getStatusBadge(r.status)}
                        </span>
                        <span>
                          Đề nghị: <strong>{formatCurrency(r.requestedAmount)} đ</strong> | Duyệt: <strong style={{ color: 'var(--success)' }}>{formatCurrency(r.approvedAmount || 0)} đ</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DANH SÁCH CÁC KHOẢN PHẢI TRỪ THÊM (XĂNG XE, CABIN, VI PHẠM...) */}
              <div style={{ marginBottom: '1.25rem', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Các khoản giảm trừ kê khai thêm khi kết thúc khóa:</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Chọn từ danh mục hoặc nhập các khoản trừ khác (tiền xăng xe, tiền thuê cabin, tiền vi phạm...)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={handleAddDeduction}
                  >
                    <Plus size={14} /> Thêm khoản trừ
                  </button>
                </div>

                {settlementDeductions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: '#fff', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                    Không có khoản giảm trừ thêm nào. Bấm "+ Thêm khoản trừ" nếu có chi phí cần cấn trừ.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {settlementDeductions.map((d, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                        <div style={{ width: '220px', flex: '0 0 auto' }}>
                          <select
                            className="form-control"
                            value={d.deductionCategoryId || ''}
                            onChange={(e) => handleDeductionChange(idx, 'deductionCategoryId', e.target.value)}
                            style={{ fontSize: '0.85rem' }}
                          >
                            <option value="">-- Khoản trừ tùy chỉnh --</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.defaultAmount)} đ)</option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Tên khoản trừ..."
                          value={d.name}
                          onChange={(e) => handleDeductionChange(idx, 'name', e.target.value)}
                          style={{ flex: 1, minWidth: '150px', fontSize: '0.85rem' }}
                        />
                        <div style={{ width: '150px', flex: '0 0 auto' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Số tiền trừ"
                            value={formatCurrencyNumber(d.amount)}
                            onChange={(e) => handleDeductionChange(idx, 'amount', parseCurrencyInput(e.target.value))}
                            style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)', fontSize: '0.85rem' }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '6px 8px' }}
                          onClick={() => handleRemoveDeduction(idx)}
                          title="Xóa khoản trừ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#dc2626', marginTop: '4px' }}>
                      Tổng các khoản trừ thêm: -{formatCurrency(totalSettlementDeductions)} đ
                    </div>
                  </div>
                )}
              </div>

              {/* SỐ TIỀN THỰC CHI THANH TOÁN */}
              <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '1rem', fontWeight: 'bold', color: '#065f46', margin: 0 }}>
                      SỐ TIỀN THANH TOÁN THỰC CHI CHO GIÁO VIÊN:
                    </label>
                    <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                      = Thù lao ({formatCurrency(selectedSettlement.grossEarned)} đ) - Đã tạm ({formatCurrency(selectedSettlement.totalAdvancePaid)} đ) - Khoản trừ ({formatCurrency(totalSettlementDeductions)} đ)
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#047857' }}>
                      {formatCurrency(finalPayoutAmount)} VNĐ
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#166534', marginTop: '6px', fontWeight: 500 }}>
                  Bằng chữ: <em>{numberToWordsVietnamese(finalPayoutAmount)}</em>
                </div>

                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    id="adjustPayCheckbox"
                    checked={useCustomPayAmount}
                    onChange={(e) => {
                      setUseCustomPayAmount(e.target.checked);
                      if (!e.target.checked) setCustomPayAmount(calculatedRemainingPay);
                    }}
                  />
                  <label htmlFor="adjustPayCheckbox" style={{ cursor: 'pointer', margin: 0, color: '#065f46' }}>
                    Điều chỉnh số tiền chi thực tế thủ công (nếu muốn làm tròn hoặc có thỏa thuận khác)
                  </label>
                </div>

                {useCustomPayAmount && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={formatCurrencyNumber(customPayAmount)}
                      onChange={(e) => setCustomPayAmount(parseCurrencyInput(e.target.value))}
                      style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)', maxWidth: '300px' }}
                    />
                  </div>
                )}
              </div>

              {/* THÔNG TIN THANH TOÁN (UNC & GHI CHÚ) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Mã giao dịch / Số ủy nhiệm chi (UNC):</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: UNC-K188-001 / FT26048123456"
                    value={settlementPaymentRef}
                    onChange={(e) => setSettlementPaymentRef(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Ghi chú quyết toán của Kế toán:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Lưu ý hoặc nội dung chuyển tiền..."
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* DANH SÁCH HỌC VIÊN PHỤ TRÁCH (CÓ THỂ MỞ RỘNG ĐỂ XEM) */}
              <details style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem', background: '#fff' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: '#475569' }}>
                  Xem danh sách chi tiết {selectedSettlement.students.length} học viên phụ trách
                </summary>
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.5rem' }}>
                  <table className="table" style={{ margin: 0, fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Học viên</th>
                        <th>CCCD</th>
                        <th style={{ textAlign: 'right' }}>Học phí</th>
                        <th style={{ textAlign: 'center' }}>%</th>
                        <th style={{ textAlign: 'right' }}>Thù lao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSettlement.students.map((st, i) => (
                        <tr key={st.id || i}>
                          <td>{i + 1}</td>
                          <td><strong>{st.name}</strong></td>
                          <td>{st.cccd || '-'}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(st.tuitionAmount)} đ</td>
                          <td style={{ textAlign: 'center' }}>{st.teacherSharePercent}%</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(st.earnedAmount)} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              {/* FOOTER ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#047857', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                  onClick={() => handlePrintSettlement(
                    selectedSettlement,
                    finalPayoutAmount,
                    settlementDeductions,
                    settlementPaymentRef,
                    settlementNotes
                  )}
                >
                  <Printer size={16} /> In phiếu thanh toán
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={handleCloseSettlementModal} disabled={submittingSettlement}>
                    Hủy bỏ
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleConfirmSettlementPayment}
                    disabled={submittingSettlement}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  >
                    <Check size={16} />
                    {submittingSettlement ? 'Đang xử lý...' : `Xác nhận Thanh toán (${formatCurrency(finalPayoutAmount)} đ)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Print Only Area */}
        <div className="print-only">
          {printDocType && (
            <PrintFinanceDocument
              type={printDocType}
              advanceData={printAdvanceData}
              settlementData={printSettlementData}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
