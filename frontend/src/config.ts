// Cấu hình URL cho API và Socket.io
// Trong môi trường development (chạy npm run dev), nó sẽ dùng localhost:5000.
// Khi deploy lên Vercel, bạn có thể thiết lập biến môi trường VITE_API_URL để trỏ về URL backend thực tế.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
