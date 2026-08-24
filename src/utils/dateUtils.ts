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

