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

  // Helper tính rate % hiển thị cho settlement
  const getTeacherRateDisplay = () => {
    if (!settlementData) return '';
    if (settlementData.students && settlementData.students.length > 0) {
      const firstPercent = settlementData.students[0].teacherSharePercent;
      return `${firstPercent}%`;
    }
    return '';
  };

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
              font-size: 11pt;
              line-height: 1.4;
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
              font-size: 10.5pt;
            }
            .print-table th, .print-table td {
              border: 1px solid #000;
              padding: 5px 6px;
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
              margin-top: 30px;
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
            font-size: 11.5pt;
            line-height: 1.45;
            color: #000;
          }
          .header-table-custom {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-bottom: 20px;
          }
          .header-table-custom td {
            border: none;
            padding: 0;
            vertical-align: top;
          }
          .doc-main-title {
            text-align: center;
            font-size: 15pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 15px 0 4px 0;
          }
          .doc-sub-teacher {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .dvt-label {
            text-align: right;
            font-style: italic;
            font-size: 10pt;
            margin-bottom: 4px;
          }
        `}
      </style>

      {/* ------------------------------------------------------------- */}
      {/* 1. MẪU IN ĐƠN / PHIẾU ĐỀ NGHỊ TẠM ỨNG                         */}
      {/* ------------------------------------------------------------- */}
      {type === 'ADVANCE_REQUEST' && advanceData && (
        <div className="print-content">
          {/* HEADER CHUẨN FORM CHÍNH THỨC */}
          <table className="header-table-custom">
            <tbody>
              <tr>
                <td style={{ width: '48%', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5pt' }}>ỦY BAN NHÂN DÂN</div>
                  <div style={{ fontSize: '10.5pt' }}>THÀNH PHỐ HỒ CHÍ MINH</div>
                  <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>TRƯỜNG CAO ĐẲNG BÁCH KHOA</div>
                  <div style={{ fontWeight: 'bold', fontSize: '10.5pt', textDecoration: 'underline' }}>NAM SÀI GÒN</div>
                </td>
                <td style={{ width: '52%', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Độc lập - Tự do - Hạnh phúc</div>
                  <div style={{ width: '140px', height: '1px', background: '#000', margin: '3px auto 6px auto' }}></div>
                  <div style={{ fontStyle: 'italic', fontSize: '10pt' }}>
                    Thành phố Hồ Chí Minh, ngày {day} tháng {month} năm {year}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TIÊU ĐỀ PHIẾU */}
          <div className="doc-main-title">
            PHIẾU ĐỀ NGHỊ TẠM ỨNG TIỀN DẠY LÁI XE {advanceData.course?.name ? advanceData.course.name.toUpperCase() : ''}
          </div>
          <div className="doc-sub-teacher">
            {advanceData.teacher?.name ? advanceData.teacher.name.toUpperCase() : ''}
          </div>

          <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '10.5pt', marginBottom: '14px' }}>
            Mã phiếu: <strong>{advanceData.requestCode}</strong> &nbsp;|&nbsp; Ngày lập: {new Date(advanceData.createdAt).toLocaleDateString('vi-VN')}
          </div>

          <div className="dvt-label">(đvt: đồng)</div>

          {/* BẢNG CHI TIẾT TẠM ỨNG THEO TỪNG HỌC VIÊN */}
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '35px' }}>STT</th>
                <th>HỌ VÀ TÊN</th>
                <th style={{ width: '120px', textAlign: 'right' }}>MỨC THU</th>
                <th style={{ width: '125px', textAlign: 'right' }}>TỔNG TIỀN THÙ LAO</th>
                <th style={{ width: '125px', textAlign: 'right' }}>ĐỀ NGHỊ TẠM ỨNG</th>
                <th style={{ width: '140px' }}>GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {advanceData.students && advanceData.students.length > 0 ? (
                advanceData.students.map((st, i) => (
                  <tr key={st.id || i}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td><strong>{st.name}</strong></td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(st.tuitionAmount)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(st.earnedAmount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {/* Phân bổ tỷ lệ đề nghị tạm ứng hoặc hiển thị ở dòng tổng cộng */}
                      {i === 0 ? formatCurrency(advanceData.requestedAmount) : '-'}
                    </td>
                    <td style={{ fontSize: '9.5pt' }}>
                      {st.transmissionType === 'AUTO' ? 'Tự động' : 'Số sàn'} ({st.teacherSharePercent}%)
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ textAlign: 'center' }}>1</td>
                  <td><strong>{advanceData.teacher?.name}</strong></td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(advanceData.totalTuitionAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(advanceData.grossEstimatedAmount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(advanceData.requestedAmount)}</td>
                  <td>{advanceData.reason || '-'}</td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f2f2f2' }}>
                <td colSpan={2} style={{ textAlign: 'center' }}>TỔNG CỘNG</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(advanceData.totalTuitionAmount)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(advanceData.grossEstimatedAmount)}</td>
                <td style={{ textAlign: 'right', fontSize: '11pt' }}>{formatCurrency(advanceData.requestedAmount)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* SỐ TIỀN BẰNG CHỮ */}
          <div style={{ margin: '8px 0', fontSize: '10.5pt' }}>
            - Số tiền đề nghị tạm ứng bằng chữ: <strong>{numberToWordsVietnamese(advanceData.requestedAmount)}</strong>
          </div>

          {/* KHOẢN GIẢM TRỪ NẾU CÓ */}
          {advanceData.deductions && advanceData.deductions.length > 0 && (
            <div style={{ margin: '8px 0', fontSize: '10pt' }}>
              - Các khoản giảm trừ kê khai kèm theo: {advanceData.deductions.map(d => `${d.name} (-${formatCurrency(d.amount)} đ)`).join('; ')}
            </div>
          )}

          {/* PHÊ DUYỆT THỰC TẾ CỦA KẾ TOÁN */}
          {advanceData.approvedAmount !== undefined && advanceData.approvedAmount !== null && (
            <div style={{ margin: '6px 0', padding: '6px 10px', border: '1px solid #000', fontSize: '10pt', background: '#fafafa' }}>
              <div>
                - Số tiền Kế toán duyệt chi: <strong>{formatCurrency(advanceData.approvedAmount)} VNĐ</strong> &nbsp;
                (Bằng chữ: <em>{numberToWordsVietnamese(advanceData.approvedAmount)}</em>)
              </div>
              {advanceData.paymentReference && (
                <div>- Số UNC / Mã chuyển khoản: <strong>{advanceData.paymentReference}</strong></div>
              )}
              {advanceData.accountantNotes && (
                <div>- Ý kiến kế toán: <em>{advanceData.accountantNotes}</em></div>
              )}
            </div>
          )}

          {/* BẢNG CHỮ KÝ 2 CỘT CHUẨN FORM TRƯỜNG NAM SÀI GÒN */}
          <table className="signature-block">
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>PHỤ TRÁCH KẾ TOÁN</div>
                  <div style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và ghi rõ họ tên)</div>
                  <div style={{ height: '75px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>{advanceData.approvedBy || '.....................................'}</div>
                </td>
                <td style={{ width: '50%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>HIỆU TRƯỞNG</div>
                  <div style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và đóng dấu)</div>
                  <div style={{ height: '75px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>.....................................</div>
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
          {/* HEADER CHUẨN FORM CHÍNH THỨC */}
          <table className="header-table-custom">
            <tbody>
              <tr>
                <td style={{ width: '48%', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5pt' }}>ỦY BAN NHÂN DÂN</div>
                  <div style={{ fontSize: '10.5pt' }}>THÀNH PHỐ HỒ CHÍ MINH</div>
                  <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>TRƯỜNG CAO ĐẲNG BÁCH KHOA</div>
                  <div style={{ fontWeight: 'bold', fontSize: '10.5pt', textDecoration: 'underline' }}>NAM SÀI GÒN</div>
                </td>
                <td style={{ width: '52%', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Độc lập - Tự do - Hạnh phúc</div>
                  <div style={{ width: '140px', height: '1px', background: '#000', margin: '3px auto 6px auto' }}></div>
                  <div style={{ fontStyle: 'italic', fontSize: '10pt' }}>
                    Thành phố Hồ Chí Minh, ngày {day} tháng {month} năm {year}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TIÊU ĐỀ BẢNG QUYẾT TOÁN THEO FORM MẪU */}
          <div className="doc-main-title">
            QUYẾT TOÁN TIỀN DẠY LÁI XE {settlementData.course.name.toUpperCase()}
          </div>
          <div className="doc-sub-teacher">
            {settlementData.teacher.name.toUpperCase()} {getTeacherRateDisplay() ? `- ${getTeacherRateDisplay()}` : ''}
          </div>

          <div className="dvt-label">(đvt: đồng)</div>

          {/* BẢNG QUYẾT TOÁN ĐẦY ĐỦ CÁC CỘT THEO ẢNH MẪU NGƯỜI DÙNG CUNG CẤP */}
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '35px' }}>STT</th>
                <th>HỌ VÀ TÊN</th>
                <th style={{ width: '110px', textAlign: 'right' }}>MỨC THU</th>
                <th style={{ width: '120px', textAlign: 'right' }}>TỔNG TIỀN THANH TOÁN</th>
                <th style={{ width: '115px', textAlign: 'right' }}>ĐÃ THANH TOÁN L1</th>
                <th style={{ width: '125px', textAlign: 'right' }}>TIẾP TỤC THANH TOÁN</th>
                <th style={{ width: '130px' }}>GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {settlementData.students && settlementData.students.length > 0 ? (
                settlementData.students.map((st, i) => {
                  // Phân bổ tỷ lệ đã thanh toán đợt trước (hoặc hiển thị trực quan)
                  const studentAdvance = settlementData.grossEarned > 0 
                    ? Math.round((st.earnedAmount / settlementData.grossEarned) * settlementData.totalAdvancePaid)
                    : 0;
                  const studentRemain = Math.max(0, st.earnedAmount - studentAdvance);

                  return (
                    <tr key={st.id || i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td><strong>{st.name}</strong></td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(st.tuitionAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(st.earnedAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(studentAdvance)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(studentRemain)}</td>
                      <td style={{ fontSize: '9pt' }}>
                        {st.transmissionType === 'AUTO' ? 'Tự động' : 'Số sàn'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td style={{ textAlign: 'center' }}>1</td>
                  <td><strong>{settlementData.teacher.name}</strong></td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(settlementData.totalTuition)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(settlementData.grossEarned)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(settlementData.totalAdvancePaid)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(settlementData.finalAmount)}</td>
                  <td>Thanh toán cuối khóa</td>
                </tr>
              )}

              {/* DÒNG TỔNG CỘNG */}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f2f2f2' }}>
                <td colSpan={2} style={{ textAlign: 'center' }}>TỔNG CỘNG</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(settlementData.totalTuition)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(settlementData.grossEarned)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(settlementData.totalAdvancePaid)}</td>
                <td style={{ textAlign: 'right', fontSize: '11pt' }}>{formatCurrency(settlementData.finalAmount)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* SỐ TIỀN BẰNG CHỮ */}
          <div style={{ margin: '8px 0', fontSize: '10.5pt' }}>
            - Số tiền thanh toán tiếp tục bằng chữ: <strong>{numberToWordsVietnamese(settlementData.finalAmount)}</strong>
          </div>

          {/* CHI TIẾT CÁC KHOẢN GIẢM TRỪ THÊM (NẾU CÓ) */}
          {settlementData.settlementDeductions && settlementData.settlementDeductions.length > 0 && (
            <div style={{ margin: '6px 0', fontSize: '10pt' }}>
              - Các khoản giảm trừ kết thúc khóa: {settlementData.settlementDeductions.map(d => `${d.name} (-${formatCurrency(d.amount)} đ)`).join('; ')}
            </div>
          )}

          {/* THÔNG TIN THANH TOÁN / UNC */}
          {(settlementData.paymentReference || settlementData.accountantNotes) && (
            <div style={{ margin: '6px 0', fontSize: '10pt', fontStyle: 'italic' }}>
              {settlementData.paymentReference && <span>Mã giao dịch / Số UNC: <strong>{settlementData.paymentReference}</strong>. </span>}
              {settlementData.accountantNotes && <span>Ghi chú: {settlementData.accountantNotes}</span>}
            </div>
          )}

          {/* BẢNG CHỮ KÝ 2 CỘT CHUẨN FORM MẪU (PHỤ TRÁCH KẾ TOÁN & HIỆU TRƯỞNG) */}
          <table className="signature-block">
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>PHỤ TRÁCH KẾ TOÁN</div>
                  <div style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và ghi rõ họ tên)</div>
                  <div style={{ height: '75px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>{settlementData.accountantName || '.....................................'}</div>
                </td>
                <td style={{ width: '50%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>HIỆU TRƯỞNG</div>
                  <div style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>(Ký và đóng dấu)</div>
                  <div style={{ height: '75px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>.....................................</div>
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
