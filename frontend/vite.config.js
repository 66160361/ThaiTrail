import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // ส่ง cookie กลับไปยัง backend ทุก request (สำคัญมากสำหรับ PHP session)
        cookieDomainRewrite: 'localhost',
        headers: {
          'X-Forwarded-Host': 'localhost:5173',
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // ส่ง cookie ทุกตัวไปกับ request
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
          });
          proxy.on('proxyRes', (proxyRes) => {
            const sc = proxyRes.headers['set-cookie'];
            if (sc) {
              // ลบ Domain=, SameSite=Strict ออกเพื่อให้ browser accept cookie บน localhost
              proxyRes.headers['set-cookie'] = sc.map((c) =>
                c
                  .replace(/;\s*Domain=[^;]*/i, '')
                  .replace(/;\s*SameSite=Strict/i, '; SameSite=Lax')
              );
            }
          });
        },
      }
    }
  }
});