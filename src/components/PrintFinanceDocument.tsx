import React from 'react';
import { numberToWordsVietnamese } from '../utils/currencyUtils';

export interface AdvanceStudentItem {
  id: number;
  name: string;
  cccd: string;
  transmissionType: string;
  scheduleType: string;
  tuitionAmount: number;
  teacherSharePercent: number;
  earnedAmount: number;
}

export interface AdvanceRequestPrintData {
  requestCode: string;
  createdAt: string;
  teacher?: { name: string; username: string; phone?: string };
  course?: { name: string };
  studentCount: number;
  grossEstimatedAmount: number;
  totalTuitionAmount?: number;
  requestedAmount: number;
  approvedAmount?: number;
  totalDeductions?: number;
  status: string;
  reason?: string;
  accountantNotes?: string;
  paymentReference?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  deductions?: Array<{ id?: number; name: string; amount: number; note?: string }>;
  students?: AdvanceStudentItem[];
}

export interface SettlementPrintData {
  requestCode?: string;
  date?: string;
  teacher: { id: number; name: string; username: string; phone?: string };
  course: { id: number; name: string };
  studentCount: number;
  totalTuition: number;
  grossEarned: number;
  totalAdvancePaid: number;
  totalSettledPaid?: number;
  remainingToPay: number;
  settlementDeductions: Array<{ name: string; amount: number; note?: string }>;
  finalAmount: number;
  paymentReference?: string;
  accountantNotes?: string;
  accountantName?: string;
  students?: AdvanceStudentItem[];
  advanceHistory?: Array<{ requestCode: string; createdAt: string; requestedAmount: number; approvedAmount?: number; status: string }>;
}

interface PrintFinanceDocumentProps {
  type: 'ADVANCE_REQUEST' | 'SETTLEMENT';
  advanceData?: AdvanceRequestPrintData | null;
  settlementData?: SettlementPrintData | null;
}

const formatCurrency = (val?: number) => new Intl.NumberFormat('vi-VN').format(val || 0);

export const PrintFinanceDocument: React.FC<PrintFinanceDocumentProps> = ({
  type,
  advanceData,
  settlementData,
}) => {
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  return (
    <div className="print-finance-container">
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 1.2cm 1.5cm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11.5pt;
              line-height: 1.45;
              color: #000 !important;
              background: #fff !important;
              margin: 0;
              padding: 0;
            }
            .print-finance-container {
              width: 100%;
              color: #000;
              background: #fff;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 11pt;
            }
            .print-table th, .print-table td {
              border: 1px solid #000;
              padding: 5px 7px;
              vertical-align: middle;
            }
            .print-table th {
              background-color: #f2f2f2 !important;
              font-weight: bold;
              text-align: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .signature-block {
              width: 100%;
              margin-top: 25px;
              border: none;
              page-break-inside: avoid;
            }
            .signature-block td {
              border: none;
              text-align: center;
              vertical-align: top;
              padding: 4px;
            }
          }
          .print-finance-container {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
          }
          .header-grid {
            display: grid;
            grid-template-columns: 45% 55%;
            margin-bottom: 15px;
            text-align: center;
          }
          .inst-name {
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
          }
          .inst-sub {
            font-weight: bold;
            font-size: 11pt;
            text-decoration: underline;
          }
          .national-title {
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
          }
          .national-sub {
            font-weight: bold;
            font-size: 11pt;
            text-decoration: underline;
          }
          .doc-title {
            text-align: center;
            font-size: 15pt;
            font-weight: bold;
            margin: 15px 0 6px 0;
            text-transform: uppercase;
          }
          .doc-code {
            text-align: center;
            font-size: 11pt;
            font-style: italic;
            margin-bottom: 15px;
          }
          .info-row {
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
          }
        `}
      </style>

      {/* ------------------------------------------------------------- */}
      {/* 1. MẪU IN ĐƠN / PHIẾU ĐỀ NGHỊ TẠM ỨNG                         */}
      {/* ------------------------------------------------------------- */}
      {type === 'ADVANCE_REQUEST' && advanceData && (
        <div className="print-content">
          <div className="header-grid">
            <div>
              <div className="inst-name">TRUNG TÂM ĐÀO TẠO LÁI XE</div>
              <div className="inst-sub">BỘ PHẬN TÀI CHÍNH KẾ TOÁN</div>
            </div>
            <div>
              <div className="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="national-sub">Độc lập – Tự do – Hạnh phúc</div>
              <div style={{ fontStyle: 'italic', fontSize: '10.5pt', marginTop: '4px' }}>
                TP. Hồ Chí Minh, ngày {day} tháng {month} năm {year}
              </div>
            </div>
          </div>

          <div className="doc-title">GIẤY ĐỀ NGHỊ TẠM ỨNG THÙ LAO</div>
          <div className="doc-code">
            Mã phiếu: <strong>{advanceData.requestCode}</strong> &nbsp;|&nbsp; Ngày nộp: {new Date(advanceData.createdAt).toLocaleDateString('vi-VN')}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontStyle: 'italic', marginBottom: '8px', textAlign: 'center' }}>
              <strong>Kính gửi:</strong> Ban Giám đốc & Phòng Tài chính - Kế toán Trung tâm
            </div>

            <div style={{ margin: '6px 0' }}>
              - Họ và tên giáo viên: <strong>{advanceData.teacher?.name}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
              - Tài khoản: <strong>@{advanceData.teacher?.username}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
              - Số ĐT: <strong>{advanceData.teacher?.phone || '..............'}</strong>
            </div>
            <div style={{ margin: '6px 0' }}>
              - Khóa đào tạo: <strong>{advanceData.course?.name || '..............'}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
              - Số lượng học viên phụ trách: <strong>{advanceData.studentCount}</strong> học viên
            </div>
            <div style={{ margin: '6px 0' }}>
              - Tổng học phí học viên đã nộp: <strong>{formatCurrency(advanceData.totalTuitionAmount)} VNĐ</strong>
            </div>
            <div style={{ margin: '6px 0' }}>
              - Tổng thù lao ước tính được hưởng: <strong>{formatCurrency(advanceData.grossEstimatedAmount)} VNĐ</strong>
            </div>
            <div style={{ margin: '6px 0' }}>
              - <strong>Số tiền đề nghị tạm ứng:</strong>{' '}
              <span style={{ fontSize: '12pt', fontWeight: 'bold' }}>{formatCurrency(advanceData.requestedAmount)} VNĐ</span>
            </div>
            <div style={{ margin: '6px 0', fontStyle: 'italic' }}>
              (Bằng chữ: <strong>{numberToWordsVietnamese(advanceData.requestedAmount)}</strong>)
            </div>
            {advanceData.reason && (
              <div style={{ margin: '6px 0' }}>
                - Lý do đề nghị tạm ứng: {advanceData.reason}
              </div>
            )}
          </div>

          {/* Bảng danh sách học viên */}
          {advanceData.students && advanceData.students.length > 0 && (
            <div style={{ margin: '10px 0' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>
                I. Danh sách học viên giáo viên phụ trách trong khóa ({advanceData.students.length} HV):
              </div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>STT</th>
                    <th>Họ và tên học viên</th>
                    <th style={{ width: '120px' }}>Số CCCD</th>
                    <th style={{ width: '130px' }}>Loại xe & Lịch</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Học phí</th>
                    <th style={{ width: '50px' }}>%</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Thù lao</th>
                  </tr>
                </thead>
                <tbody>
                  {advanceData.students.map((st, i) => (
                    <tr key={st.id || i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td><strong>{st.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>{st.cccd || '-'}</td>
                      <td>
                        {st.transmissionType === 'AUTO' ? 'Tự động' : 'Số sàn'} - {st.scheduleType === 'SUNDAY' ? 'Cuối tuần' : 'Ngày thường'}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(st.tuitionAmount)} đ</td>
                      <td style={{ textAlign: 'center' }}>{st.teacherSharePercent}%</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(st.earnedAmount)} đ</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                    <td colSpan={4} style={{ textAlign: 'center' }}>TỔNG CỘNG</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(advanceData.totalTuitionAmount)} đ</td>
                    <td style={{ textAlign: 'center' }}>-</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(advanceData.grossEstimatedAmount)} đ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Các khoản giảm trừ nếu có */}
          {advanceData.deductions && advanceData.deductions.length > 0 && (
            <div style={{ margin: '10px 0' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>
                II. Các khoản giảm trừ kê khai đợt này:
              </div>
              <table className="print-table" style={{ width: '75%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>STT</th>
                    <th>Nội dung khoản trừ</th>
                    <th style={{ width: '140px', textAlign: 'right' }}>Số tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {advanceData.deductions.map((d, i) => (
                    <tr key={d.id || i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td>{d.name}</td>
                      <td style={{ textAlign: 'right' }}>-{formatCurrency(d.amount)} đ</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ textAlign: 'center' }}>TỔNG CỘNG GIẢM TRỪ</td>
                    <td style={{ textAlign: 'right' }}>
                      -{formatCurrency(advanceData.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0))} đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Phần xét duyệt của Kế toán & Ban Giám đốc */}
          <div style={{ margin: '12px 0', padding: '8px 12px', border: '1px solid #000' }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
              PHẦN PHÊ DUYỆT CỦA PHÒNG KẾ TOÁN TÀI CHÍNH:
            </div>
            <div>
              - Tình trạng duyệt: <strong>{advanceData.status === 'PAID' ? 'ĐÃ CHI TIỀN' : advanceData.status === 'APPROVED' ? 'ĐÃ DUYỆT (CHỜ CHI)' : advanceData.status === 'REJECTED' ? 'TỪ CHỐI' : 'CHỜ DUYỆT'}</strong>
            </div>
            <div>
              - Số tiền duyệt chi thực tế: <strong>{formatCurrency(advanceData.approvedAmount !== undefined && advanceData.approvedAmount !== null ? advanceData.approvedAmount : advanceData.requestedAmount)} VNĐ</strong>
              &nbsp;&nbsp; (Bằng chữ: <em>{numberToWordsVietnamese(advanceData.approvedAmount !== undefined && advanceData.approvedAmount !== null ? advanceData.approvedAmount : advanceData.requestedAmount)}</em>)
            </div>
            {advanceData.paymentReference && (
              <div>
                - Mã giao dịch / UNC ngân hàng: <strong>{advanceData.paymentReference}</strong>
              </div>
            )}
            {advanceData.accountantNotes && (
              <div>
                - Ghi chú kế toán: {advanceData.accountantNotes}
              </div>
            )}
          </div>

          {/* Chữ ký */}
          <table className="signature-block">
            <tbody>
              <tr>
                <td style={{ width: '25%' }}>
                  <strong>GIÁO VIÊN ĐỀ NGHỊ</strong><br />
                  <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và ghi rõ họ tên)</span>
                  <div style={{ height: '65px' }}></div>
                  <strong>{advanceData.teacher?.name}</strong>
                </td>
                <td style={{ width: '25%' }}>
                  <strong>KẾ TOÁN ĐỐI SOÁT</strong><br />
                  <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và ghi rõ họ tên)</span>
                  <div style={{ height: '65px' }}></div>
                  <strong>{advanceData.approvedBy || '...........................'}</strong>
                </td>
                <td style={{ width: '25%' }}>
                  <strong>THỦ QUỸ / NGÂN HÀNG</strong><br />
                  <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký xác nhận chi)</span>
                  <div style={{ height: '65px' }}></div>
                  <strong>...........................</strong>
                </td>
                <td style={{ width: '25%' }}>
                  <strong>GIÁM ĐỐC TRUNG TÂM</strong><br />
                  <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và đóng dấu)</span>
                  <div style={{ height: '65px' }}></div>
                  <strong>...........................</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MẪU IN PHIẾU THANH TOÁN / QUYẾT TOÁN CUỐI KHÓA            */}
      {/* ------------------------------------------------------------- */}
      {type === 'SETTLEMENT' && settlementData && (
        <div className="print-content">
          <div className="header-grid">
            <div>
              <div className="inst-name">TRUNG TÂM ĐÀO TẠO LÁI XE</div>
              <div className="inst-sub">BỘ PHẬN TÀI CHÍNH KẾ TOÁN</div>
            </div>
            <div>
              <div className="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="national-sub">Độc lập – Tự do – Hạnh phúc</div>
              <div style={{ fontStyle: 'italic', fontSize: '10.5pt', marginTop: '4px' }}>
                TP. Hồ Chí Minh, ngày {day} tháng {month} năm {year}
              </div>
            </div>
          </div>

          <div className="doc-title">BẢNG QUYẾT TOÁN & THANH TOÁN THÙ LAO GIÁO VIÊN</div>
          <div className="doc-code">
            Khóa học: <strong>{settlementData.course.name}</strong> &nbsp;|&nbsp; Giáo viên: <strong>{settlementData.teacher.name}</strong>
            {settlementData.requestCode && <> &nbsp;|&nbsp; Mã phiếu: <strong>{settlementData.requestCode}</strong></>}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ margin: '6px 0' }}>
              - Họ và tên giáo viên: <strong>{settlementData.teacher.name}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
              - Tên tài khoản: <strong>@{settlementData.teacher.username}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
              - Số điện thoại: <strong>{settlementData.teacher.phone || '..............'}</strong>
            </div>
            <div style={{ margin: '6px 0' }}>
              - Khóa đào tạo: <strong>{settlementData.course.name}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
              - Số học viên phụ trách tốt nghiệp/kết thúc khóa: <strong>{settlementData.studentCount}</strong> học viên
            </div>
            <div style={{ margin: '6px 0' }}>
              - Tổng số tiền học phí học viên đã nộp: <strong>{formatCurrency(settlementData.totalTuition)} VNĐ</strong>
            </div>
          </div>

          {/* BẢNG TỔNG HỢP QUYẾT TOÁN */}
          <div style={{ margin: '12px 0' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>
              I. Bảng tổng hợp đối soát thù lao, tạm ứng và giảm trừ:
            </div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>STT</th>
                  <th>Khoản mục đối soát</th>
                  <th style={{ width: '160px', textAlign: 'right' }}>Số tiền (VNĐ)</th>
                  <th style={{ width: '220px' }}>Ghi chú / Căn cứ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center' }}>1</td>
                  <td><strong>(A) Tổng thù lao được hưởng theo học viên</strong></td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(settlementData.grossEarned)} đ</td>
                  <td>Theo danh sách {settlementData.studentCount} học viên</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>2</td>
                  <td><strong>(B) Tổng các đợt đã tạm ứng trong khóa</strong></td>
                  <td style={{ textAlign: 'right', color: '#000', fontWeight: 'bold' }}>-{formatCurrency(settlementData.totalAdvancePaid)} đ</td>
                  <td>
                    {settlementData.advanceHistory && settlementData.advanceHistory.length > 0
                      ? `Đã tạm ứng ${settlementData.advanceHistory.length} đợt`
                      : 'Các phiếu tạm ứng đã chi'}
                  </td>
                </tr>
                {settlementData.totalSettledPaid && settlementData.totalSettledPaid > 0 ? (
                  <tr>
                    <td style={{ textAlign: 'center' }}>3</td>
                    <td>(C) Các đợt quyết toán trước đã chi</td>
                    <td style={{ textAlign: 'right' }}>-{formatCurrency(settlementData.totalSettledPaid)} đ</td>
                    <td>Đã quyết toán đợt trước</td>
                  </tr>
                ) : null}
                <tr>
                  <td style={{ textAlign: 'center' }}>{settlementData.totalSettledPaid && settlementData.totalSettledPaid > 0 ? 4 : 3}</td>
                  <td><strong>(D) Các khoản giảm trừ kết thúc khóa kê khai thêm</strong></td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    -{formatCurrency(settlementData.settlementDeductions.reduce((s, d) => s + (Number(d.amount) || 0), 0))} đ
                  </td>
                  <td>Xăng xe, cabin, vi phạm, chi phí khác</td>
                </tr>
                <tr style={{ fontWeight: 'bold', backgroundColor: '#f2f2f2', fontSize: '11.5pt' }}>
                  <td style={{ textAlign: 'center' }}>★</td>
                  <td style={{ textTransform: 'uppercase' }}>SỐ TIỀN THỰC CHI THANH TOÁN ĐỢT NÀY</td>
                  <td style={{ textAlign: 'right', fontSize: '12pt' }}>
                    {formatCurrency(settlementData.finalAmount)} đ
                  </td>
                  <td>Thanh toán dứt điểm cuối khóa</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '8px', fontStyle: 'italic', fontSize: '11.5pt' }}>
              Số tiền bằng chữ: <strong>{numberToWordsVietnamese(settlementData.finalAmount)}</strong>
            </div>
          </div>

          {/* CHI TIẾT CÁC KHOẢN GIẢM TRỪ THÊM (NẾU CÓ) */}
          {settlementData.settlementDeductions && settlementData.settlementDeductions.length > 0 && (
            <div style={{ margin: '10px 0' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>
                II. Chi tiết các khoản giảm trừ kê khai bổ sung cuối khóa:
              </div>
              <table className="print-table" style={{ width: '85%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>STT</th>
                    <th>Tên khoản giảm trừ</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Số tiền (VNĐ)</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementData.settlementDeductions.map((d, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td>{d.name}</td>
                      <td style={{ textAlign: 'right' }}>-{formatCurrency(d.amount)} đ</td>
                      <td>{d.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LỊCH SỬ CÁC ĐỢT TẠM ỨNG NẾU CÓ */}
          {settlementData.advanceHistory && settlementData.advanceHistory.length > 0 && (
            <div style={{ margin: '10px 0' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>
                III. Lịch sử các phiếu tạm ứng đã chi trong khóa:
              </div>
              <table className="print-table" style={{ width: '85%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>STT</th>
                    <th style={{ width: '130px' }}>Mã phiếu</th>
                    <th style={{ width: '110px' }}>Ngày lập</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Số tiền tạm ứng</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementData.advanceHistory.map((r, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ textAlign: 'center' }}><strong>{r.requestCode}</strong></td>
                      <td style={{ textAlign: 'center' }}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(r.approvedAmount || r.requestedAmount)} đ</td>
                      <td style={{ textAlign: 'center' }}>{r.status === 'PAID' ? 'Đã chi tiền' : r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* THÔNG TIN THANH TOÁN */}
          <div style={{ margin: '10px 0', padding: '6px 12px', border: '1px solid #000' }}>
            <div>
              - Phương thức thanh toán: <strong>Chuyển khoản Ngân hàng / Ủy nhiệm chi (UNC)</strong>
            </div>
            {settlementData.paymentReference && (
              <div>
                - Số UNC / Mã giao dịch ngân hàng: <strong>{settlementData.paymentReference}</strong>
              </div>
            )}
            {settlementData.accountantNotes && (
              <div>
                - Ghi chú: {settlementData.accountantNotes}
              </div>
            )}
          </div>

          {/* CHỮ KÝ */}
          <table className="signature-block">
            <tbody>
              <tr>
                <td style={{ width: '25%' }}>
                  <strong>GIÁO VIÊN</strong><br />
                  <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký nhận thù lao)</span>
                  <div style={{ height: '65px' }}></div>
                  <strong>{settlementData.teacher.name}</strong>
                </td>
                <td style={{ width: '25%' }}>
                  <strong>KẾ TOÁN THANH TOÁN</strong><br />
                  <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và ghi rõ họ tên)</span>
                  <div style={{ height: '65px' }}></div>
                  <strong>{settlementData.accountantName || '...........................'}</strong>
                </td>
                <td style={{ width: '25%' }}>
                  <strong>KẾ TOÁN TRƯỞNG</strong><br />
                  <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và ghi rõ họ tên)</span>
                  <div style={{ height: '65px' }}></div>
                  <strong>...........................</strong>
                </td>
                <td style={{ width: '25%' }}>
                  <strong>GIÁM ĐỐC TRUNG TÂM</strong><br />
                  <span style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và đóng dấu)</span>
                  <div style={{ height: '65px' }}></div>
                  <strong>...........................</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PrintFinanceDocument;
