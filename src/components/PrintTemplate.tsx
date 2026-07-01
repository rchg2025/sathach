import React from 'react';

interface PrintTemplateProps {
  students: any[];
}

const PrintTemplate: React.FC<PrintTemplateProps> = ({ students }) => {
  return (
    <div className="print-template-container">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 14pt;
              line-height: 1.5;
            }
            .page-break {
              page-break-after: always;
            }
            .print-page {
              width: 100%;
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
        // Safe check for results
        const saHinhScore = student.scoreSaHinh !== '-' ? student.scoreSaHinh : '';
        const chuZScore = student.scoreChuZ !== '-' ? student.scoreChuZ : '';
        const duongTruongScore = student.scoreDuongTruong !== '-' ? student.scoreDuongTruong : '';

        // Calculate "Điểm trừ" - assuming max score is 100 for Sa Hình, Đường Trường and 10 for Chữ Z based on the template
        const getDiemTru = (max: number, score: any) => {
          if (score === 'Vắng') return 'Vắng';
          if (score === 'Đang thi') return '';
          if (score === '' || score === '-') return '';
          const num = Number(score);
          if (!isNaN(num)) return max - num;
          return '';
        };

        const diemTruSaHinh = getDiemTru(100, saHinhScore);
        const diemTruChuZ = getDiemTru(10, chuZScore);
        const diemTruDuongTruong = getDiemTru(100, duongTruongScore);

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

            <div className="info-block">
              <div>Khóa đào tạo: <strong>{student.courseName || (student.course && student.course.name) || '................'}</strong></div>
              <div>Hạng đào tạo: <strong>Hạng B</strong> (số: .................)</div>
              <div>Họ tên học viên: <strong>{student.name}</strong></div>
              <div>SBD / Mã ĐK: <strong>{student.registrationCode || student.cccd || '................'}</strong></div>
              <div>Ngày thi: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></div>
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>KẾT QUẢ:</div>
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
                <tr>
                  <td>1</td>
                  <td className="text-left">Thực hành lái xe trong hình</td>
                  <td>100<br/>Kết quả ≥ 80: Đạt</td>
                  <td>{diemTruSaHinh}</td>
                  <td>{saHinhScore}</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td className="text-left">Thực hành tiến lùi chữ chi</td>
                  <td>10<br/>Kết quả ≥ 5: Đạt</td>
                  <td>{diemTruChuZ}</td>
                  <td>{chuZScore}</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td className="text-left">Thực hành lái xe trên đường</td>
                  <td>100<br/>Kết quả ≥ 80: Đạt</td>
                  <td>{diemTruDuongTruong}</td>
                  <td>{duongTruongScore}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>
              KẾT LUẬN CỦA HỘI ĐỒNG THI
            </div>
            
            <div style={{ display: 'flex', marginBottom: '20px' }}>
              <div style={{ width: '50%' }}>
                Đạt : {isDat ? '☑' : '☐'}
              </div>
              <div style={{ width: '50%' }}>
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
