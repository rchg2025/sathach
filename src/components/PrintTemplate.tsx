import { formatDateDisplay } from '../utils/dateUtils';
import React from 'react';

interface PrintTemplateProps {
  students: any[];
  testTypes?: any[];
  printDate?: string;
}

const PrintTemplate: React.FC<PrintTemplateProps> = ({ students, testTypes = [], printDate }) => {
  return (
    <div className="print-template-container">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.5;
              margin: 0;
              padding: 0;
            }
            .page-break {
              page-break-after: always;
            }
            .print-page:last-child {
              page-break-after: auto;
            }
            .print-page {
              width: 100%;
              padding: 1.5cm;
              box-sizing: border-box;
            }
            .header-table {
              width: 100%;
              text-align: center;
              margin-bottom: 20px;
            }
            .header-table td {
              vertical-align: top;
            }
            .title {
              text-align: center;
              font-weight: bold;
              font-size: 16pt;
              margin: 30px 0;
            }
            .info-block {
              margin-bottom: 20px;
            }
            .info-block div {
              margin-bottom: 5px;
            }
            .result-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .result-table th, .result-table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: center;
            }
            .result-table th {
              font-weight: bold;
            }
            .result-table td.text-left {
              text-align: left;
            }
            .footer-signature {
              width: 100%;
              margin-top: 30px;
            }
            .footer-signature td {
              width: 50%;
              text-align: center;
              vertical-align: top;
            }
          }
        `}
      </style>

      {students.map((student, index) => {
        const getDiemTru = (max: number, score: any) => {
          if (score === 'Vắng') return 'Vắng';
          if (score === 'Đang thi') return '';
          if (score === '' || score === '-') return '';
          const num = Number(score);
          if (!isNaN(num)) return max - num;
          return '';
        };

        const isDat = student.finalStatus === 'ĐẬU';
        const isKhongDat = student.finalStatus === 'RỚT';

        return (
          <div key={student.id} className={`print-page ${index < students.length - 1 ? 'page-break' : ''}`}>
            <table className="header-table">
              <tbody>
                <tr>
                  <td style={{ width: '40%' }}>
                    <div style={{ fontWeight: 'bold' }}>PHÒNG QUẢN LÝ ĐÀO TẠO</div>
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>TRUNG TÂM ĐÀO TẠO LÁI XE</div>
                  </td>
                  <td style={{ width: '60%' }}>
                    <div style={{ fontWeight: 'bold' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Độc lập – Tự do – Hạnh phúc</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="title">
              PHIẾU ĐÁNH GIÁ THI THỰC HÀNH LÁI XE Ô TÔ
            </div>

            <table style={{ width: '100%', marginBottom: '20px', border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', paddingBottom: '5px' }}>
                    Khóa đào tạo: <strong>{student.courseName || (student.course && student.course.name) || '................'}</strong>
                  </td>
                  <td style={{ width: '50%', paddingBottom: '5px' }}>
                    Hạng đào tạo: <strong>Hạng B</strong> (số: .........)
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '5px' }}>
                    Họ tên học viên: <strong>{student.name}</strong>
                  </td>
                  <td style={{ paddingBottom: '5px' }}>
                    SBD / Mã ĐK: <strong>{student.registrationCode || student.cccd || '................'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '5px' }}>
                    Ngày thi: <strong>{printDate ? formatDateDisplay(printDate) : formatDateDisplay(new Date())}</strong>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>A. KẾT QUẢ:</div>
            <table className="result-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>TT</th>
                  <th style={{ width: '35%' }}>Nội dung thi</th>
                  <th style={{ width: '20%' }}>Thang điểm</th>
                  <th style={{ width: '20%' }}>Điểm trừ</th>
                  <th style={{ width: '20%' }}>Điểm đạt được</th>
                </tr>
              </thead>
              <tbody>
                {testTypes.map((tt: any, index: number) => {
                  const scoreVal = student.scores && student.scores[tt.id] !== '-' ? student.scores[tt.id] : '';
                  const maxScore = tt.maxScore || 100;
                  const passingScore = tt.passingScore || 80;
                  const diemTru = getDiemTru(maxScore, scoreVal);
                  return (
                    <tr key={tt.id}>
                      <td>{index + 1}</td>
                      <td className="text-left">Thực hành tại trạm {tt.name}</td>
                      <td>{maxScore}<br/>Kết quả ≥ {passingScore}: Đạt</td>
                      <td>{diemTru}</td>
                      <td>{scoreVal}</td>
                    </tr>
                  );
                })}
                {testTypes.length === 0 && (
                  <tr><td colSpan={5}>Không có dữ liệu trạm thi</td></tr>
                )}
              </tbody>
            </table>

            <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>
              B. KẾT LUẬN CỦA HỘI ĐỒNG THI
            </div>
            
            <div style={{ display: 'flex', marginBottom: '40px' }}>
              <div style={{ width: '50%', textAlign: 'center', fontWeight: 'bold' }}>
                Đạt : {isDat ? '☑' : '☐'}
              </div>
              <div style={{ width: '50%', textAlign: 'center', fontWeight: 'bold' }}>
                Không đạt : {isKhongDat ? '☑' : '☐'}
              </div>
            </div>

            <table className="footer-signature">
              <tbody>
                <tr>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>Thư ký hội đồng</div>
                    <div>(Ký và ghi rõ họ tên)</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>Học viên ký xác nhận kết quả</div>
                    <div>(Ký và ghi rõ họ tên)</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default PrintTemplate;
