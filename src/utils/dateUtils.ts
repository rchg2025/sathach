export const getLocalDateString = (dateInput?: string | Date) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // Format: YYYY-MM-DD
};

export const formatDateDisplay = (dateInput?: string | Date | null) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }); // Format: DD/MM/YYYY
};

export const formatDateWithDayOfWeek = (dateInput?: string | Date | null) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const dateStr = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }); // DD/MM/YYYY
  // Lấy ngày trong tuần theo giờ VN
  const days = ['chủ nhật', 'thứ hai', 'thứ ba', 'thứ tư', 'thứ năm', 'thứ sáu', 'thứ bảy'];
  // Chuyển sang ngày theo múi giờ Asia/Ho_Chi_Minh
  const vnDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const dayOfWeek = days[vnDate.getDay()];
  return `${dateStr} (${dayOfWeek})`;
};

export const formatTimeDisplay = (dateInput?: string | Date | null) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

export const formatDateTimeDisplay = (dateInput?: string | Date | null) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

