import React from 'react';

interface PrintErrorTemplateProps {
  students: any[];
  testTypes?: any[];
}

const PrintErrorTemplate: React.FC<PrintErrorTemplateProps> = ({ students, testTypes = [] }) => {
  return (
    <div className="print-error-template-container">
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
            .error-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .error-table th, .error-table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            .error-table th {
              font-weight: bold;
              text-align: center;
            }
            .summary-table {
              width: 100%;
              margin-bottom: 30px;
              border-collapse: collapse;
            }
            .summary-table td {
              padding: 5px;
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

      {students.map((student) => {
        // Collect errors
        const trs = student.testResults || [];
        const errorList: any[] = [];
        let diemTruSaHinh = 0;
        let diemTruChuZ = 0;
        let diemTruDuongTruong = 0;

        let scoreSaHinh = student.scoreSaHinh;
        let scoreChuZ = student.scoreChuZ;
        let scoreDuongTruong = student.scoreDuongTruong;

        trs.forEach((tr: any) => {
          const testName = tr.testType?.name || 'Chưa rõ';
          const testNameLower = testName.toLowerCase();
          
          if (tr.scores && tr.scores.length > 0) {
            tr.scores.forEach((sc: any) => {
              if (sc.criterion) {
                const deduction = (sc.criterion.pointsToDeduct || 0) * (sc.timesDeducted || 1);
                errorList.push({
                  testName,
                  errorName: sc.criterion.name,
                  deduction
                });

                if (testNameLower.includes('sa hình')) diemTruSaHinh += deduction;
                if (testNameLower.includes('chữ z')) diemTruChuZ += deduction;
                if (testNameLower.includes('đường trường')) diemTruDuongTruong += deduction;
              }
            });
          }
        });

        const isDat = student.finalStatus === 'ĐẬU';
        const isKhongDat = student.finalStatus === 'RỚT';

        return (
          <div key={student.id} className="print-page page-break">
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
                    Ngày thi: <strong>{new Date().toLocaleDateString('vi-VN')}</strong>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>THÔNG TIN CÁC LỖI:</div>
            
            {errorList.length > 0 ? (
              <table className="error-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>TT</th>
                    <th style={{ width: '25%' }}>Trạm thi</th>
                    <th style={{ width: '50%' }}>Tên lỗi</th>
                    <th style={{ width: '20%' }}>Điểm trừ</th>
                  </tr>
                </thead>
                <tbody>
                  {errorList.map((err, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td>{err.testName}</td>
                      <td>{err.errorName}</td>
                      <td style={{ textAlign: 'center' }}>-{err.deduction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontStyle: 'italic', marginBottom: '20px' }}>(Không ghi nhận lỗi nào)</div>
            )}

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>KẾT QUẢ:</div>
            <table className="summary-table">
              <tbody>
                {testTypes.map((tt: any) => {
                  const scoreVal = student.scores && student.scores[tt.id] !== '-' ? student.scores[tt.id] : '';
                  const maxScore = tt.maxScore || 100;
                  const diemTru = getDiemTru(maxScore, scoreVal);
                  return (
                    <tr key={tt.id}>
                      <td>Điểm trừ {tt.name}: <strong>{diemTru}</strong></td>
                      <td>Điểm còn lại: <strong>{scoreVal}</strong></td>
                    </tr>
                  );
                })}
                {testTypes.length === 0 && (
                  <tr><td colSpan={2}>Không có dữ liệu trạm thi</td></tr>
                )}
              </tbody>
            </table>

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

export default PrintErrorTemplate;
