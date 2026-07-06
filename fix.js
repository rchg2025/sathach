const fs = require('fs');
const file = 'src/pages/StudentManager.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace imports if not already there
if (!content.includes("import ExcelJS from 'exceljs';")) {
  content = content.replace("import * as XLSX from 'xlsx';", "import * as XLSX from 'xlsx';\nimport ExcelJS from 'exceljs';\nimport QRCode from 'qrcode';");
}

// Use Regex to replace the entire exportToExcel function
// Finding the function block: starts with "const exportToExcel =" and ends with the next function "const downloadTemplate ="
const regex = /const exportToExcel =[\s\S]*?(?=const downloadTemplate =)/;
const match = content.match(regex);
if (match) {
  const newExport = `const exportToExcel = async () => {
    const toastId = toast.loading('Đang xuất file Excel...');
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('HocVien');
      
      // Define columns
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Khóa đào tạo', key: 'course', width: 15 },
        { header: 'Mã ĐK', key: 'regCode', width: 20 },
        { header: 'Họ tên', key: 'name', width: 25 },
        { header: 'Ngày sinh', key: 'dob', width: 15 },
        { header: 'CCCD', key: 'cccd', width: 15 },
        { header: 'Địa chỉ', key: 'address', width: 30 },
        { header: 'Số GPLX', key: 'license', width: 15 },
        { header: 'Hạng', key: 'class', width: 10 },
        { header: 'Ngày cấp', key: 'issue', width: 15 },
        { header: 'Ngày trúng tuyển', key: 'pass', width: 15 },
        { header: 'Ngày hết hạn', key: 'expiry', width: 15 },
        { header: 'Thời gian GPLX', key: 'duration', width: 15 },
        { header: 'Giáo viên dạy thực hành', key: 'teacher', width: 25 },
        { header: 'Mã QR', key: 'qr', width: 15 } // We'll put image here
      ];

      // Add rows and images
      for (let i = 0; i < filteredStudents.length; i++) {
        const s = filteredStudents[i];
        const row = worksheet.addRow({
          stt: i + 1,
          course: s.courseName || '',
          regCode: s.registrationCode || '',
          name: s.name,
          dob: s.dob || '',
          cccd: s.cccd,
          address: s.address || '',
          license: s.licenseNumber || '',
          class: s.licenseClass || '',
          issue: s.licenseIssueDate || '',
          pass: s.passDate || '',
          expiry: s.licenseExpiryDate || '',
          duration: s.licenseDuration || '',
          teacher: s.teacher?.name || ''
        });

        // Generate QR image base64
        const qrText = \`\${s.cccd}|\${s.name}\`;
        const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1 });
        
        const imageId = workbook.addImage({
          base64: qrDataUrl,
          extension: 'png',
        });
        
        // Add image to the 'O' column (Mã QR) at current row
        worksheet.addImage(imageId, {
          tl: { col: 14, row: i + 1 }, // 14 = column O (0-indexed)
          ext: { width: 80, height: 80 }
        });

        // Set row height to accommodate the image
        row.height = 65;
      }
      
      // Center align cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle' };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'danh-sach-hoc-vien.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Xuất file thành công', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi xuất file', { id: toastId });
    }
  };

  `;
  content = content.replace(regex, newExport);
  console.log("exportToExcel replaced");
} else {
  console.error("Could not find exportToExcel");
}

fs.writeFileSync(file, content, 'utf8');
