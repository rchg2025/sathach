// Hàm chuyển đổi số tiền thành chữ tiếng Việt chuẩn
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(threeDigits: number, showZeroHundred: boolean): string {
  const hundred = Math.floor(threeDigits / 100);
  const remainder = threeDigits % 100;
  const ten = Math.floor(remainder / 10);
  const one = remainder % 10;
  let result = '';

  if (hundred > 0 || showZeroHundred) {
    result += `${DIGITS[hundred]} trăm `;
  }

  if (ten > 1) {
    result += `${DIGITS[ten]} mươi `;
    if (one === 1) result += 'mốt ';
    else if (one === 5) result += 'lăm ';
    else if (one > 0) result += `${DIGITS[one]} `;
  } else if (ten === 1) {
    result += 'mười ';
    if (one === 5) result += 'lăm ';
    else if (one > 0) result += `${DIGITS[one]} `;
  } else if (ten === 0 && one > 0) {
    if (hundred > 0 || showZeroHundred) result += 'lẻ ';
    result += `${DIGITS[one]} `;
  }

  return result.trim();
}

export function numberToWordsVietnamese(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  const n = typeof num === 'string' ? Math.round(Number(num.replace(/\D/g, ''))) : Math.round(num);
  if (isNaN(n) || n === 0) return 'Không đồng';
  if (n < 0) return `Âm ${numberToWordsVietnamese(Math.abs(n))}`;

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let temp = n;
  const groups: number[] = [];

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showZeroHundred = i < groups.length - 1;
      const groupWords = readThreeDigits(groupVal, showZeroHundred);
      words += `${groupWords} ${scales[i]} `;
    }
  }

  words = words.trim().replace(/\s+/g, ' ');
  if (!words) return 'Không đồng';

  // Viết hoa chữ cái đầu và thêm đuôi "đồng"
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalized} đồng`;
}

// Format số tiền có dấu phân cách hàng nghìn (VD: 5.000.000)
export function formatCurrencyNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const n = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : Number(val);
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('vi-VN').format(n);
}

// Parse chuỗi có dấu phân cách hoặc chuỗi số về number an toàn
export function parseCurrencyInput(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = val.toString().replace(/[^0-9]/g, '');
  return clean ? Number(clean) : 0;
}
