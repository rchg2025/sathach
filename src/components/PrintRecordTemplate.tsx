import React from 'react';

interface PrintRecordTemplateProps {
  records: any[];
}

const PrintRecordTemplate: React.FC<PrintRecordTemplateProps> = ({ records }) => {
  return (
    <div className="print-record-template-container">
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

      {records.map((record, index) => {
        const { student, testResult, examiner, progresses, activeExams } = record;
        
        let startTime: Date | null = null;
        let endTime: Date | null = null;
        
        progresses.forEach((p: any) => {
          if (p.startTime) {
            const st = new Date(p.startTime);
            if (!startTime || st < startTime) startTime = st;
          }
          if (p.endTime) {
            const et = new Date(p.endTime);
            if (!endTime || et > endTime) endTime = et;
          }
        });

        const formatDate = (date: Date | null) => {
          if (!date) return '...';
          return date.toLocaleTimeString('vi-VN', { hour12: false }) + ' ' + date.toLocaleDateString('vi-VN');
        };

        const calcTotalTime = (start: Date | null, end: Date | null) => {
          if (!start || !end) return '...';
          const diffMs = end.getTime() - start.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          return `${diffMins} phút ${diffSecs} giây`;
        };

        const errorList: any[] = [];
        const examMap = new Map();
        
        activeExams.forEach((exam: any) => {
          examMap.set(exam.id, exam.name);
        });

        if (testResult.scores) {
          testResult.scores.forEach((sc: any) => {
            if (sc.criterion && examMap.has(sc.criterion.examId)) {
              const examName = examMap.get(sc.criterion.examId);
              const times = sc.timesDeducted || 1;
              const deduct = sc.criterion.pointsToDeduct || 0;
              errorList.push({
                examName,
                errorName: sc.criterion.name,
                times,
                deduct,
                total: times * deduct
              });
            }
          });
        }

        return (
          <div key={index} className={`print-page ${index < records.length - 1 ? 'page-break' : ''}`}>
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
              BIÊN BẢN CHẤM THI THỰC HÀNH LÁI XE
            </div>

            <table style={{ width: '100%', marginBottom: '20px', border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', paddingBottom: '5px' }}>
                    Khóa đào tạo: <strong>{student.courseName || (student.course && student.course.name) || '................'}</strong>
                  </td>
                  <td style={{ width: '50%', paddingBottom: '5px' }}>
                    Số xe sát hạch: <strong>{testResult.vehicle?.name || '................'}</strong>
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
                  <td style={{ paddingBottom: '5px' }}>
                    Trạm chấm: <strong>{testResult.testType?.name || '................'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '5px' }}>
                    Thời gian bắt đầu: <strong>{formatDate(startTime)}</strong>
                  </td>
                  <td style={{ paddingBottom: '5px' }}>
                    Thời gian kết thúc: <strong>{formatDate(endTime)}</strong>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ paddingBottom: '5px' }}>
                    Tổng thời gian sát hạch: <strong>{calcTotalTime(startTime, endTime)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>CÁC LỖI BỊ TRỪ ĐIỂM:</div>
            
            {errorList.length > 0 ? (
              <table className="error-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>TT</th>
                    <th style={{ width: '25%' }}>Tên bài chấm</th>
                    <th style={{ width: '40%' }}>Tên lỗi</th>
                    <th style={{ width: '10%' }}>Số lần mắc lỗi</th>
                    <th style={{ width: '10%' }}>Điểm trừ</th>
                    <th style={{ width: '10%' }}>Tổng điểm trừ</th>
                  </tr>
                </thead>
                <tbody>
                  {errorList.map((err, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td>{err.examName}</td>
                      <td>{err.errorName}</td>
                      <td style={{ textAlign: 'center' }}>{err.times}</td>
                      <td style={{ textAlign: 'center' }}>-{err.deduct}</td>
                      <td style={{ textAlign: 'center' }}>-{err.total}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>Tổng cộng điểm bị trừ:</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'red' }}>
                      -{errorList.reduce((sum, err) => sum + err.total, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ fontStyle: 'italic', marginBottom: '20px' }}>(Không ghi nhận lỗi nào)</div>
            )}

            <table className="footer-signature">
              <tbody>
                <tr>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>Học viên</div>
                    <div>(Ký và ghi rõ họ tên)</div>
                    <div style={{ marginTop: '60px' }}><strong>{student.name}</strong></div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>Giám khảo chấm thi</div>
                    <div>(Ký và ghi rõ họ tên)</div>
                    <div style={{ marginTop: '60px' }}><strong>{examiner.name}</strong></div>
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

export default PrintRecordTemplate;
