import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // ส่ง Set-Cookie header จาก backend ผ่านมาถึง browser โดยตรง
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const sc = proxyRes.headers['set-cookie'];
            if (sc) {
              // ลบ Domain= attribute ออกเพื่อให้ browser accept cookie บน localhost
              proxyRes.headers['set-cookie'] = sc.map((c) =>
                c.replace(/;\s*Domain=[^;]*/i, '')
              );
            }
          });
        },
      }
    }
  }
});