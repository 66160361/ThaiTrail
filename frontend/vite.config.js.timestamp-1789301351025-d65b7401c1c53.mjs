// vite.config.js
import { defineConfig } from "file:///Users/niyada/Desktop/if-borrowhub/ThaiTrail/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///Users/niyada/Desktop/if-borrowhub/ThaiTrail/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///Users/niyada/Desktop/if-borrowhub/ThaiTrail/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        // ส่ง Set-Cookie header จาก backend ผ่านมาถึง browser โดยตรง
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const sc = proxyRes.headers["set-cookie"];
            if (sc) {
              proxyRes.headers["set-cookie"] = sc.map(
                (c) => c.replace(/;\s*Domain=[^;]*/i, "")
              );
            }
          });
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbml5YWRhL0Rlc2t0b3AvaWYtYm9ycm93aHViL1RoYWlUcmFpbC9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL25peWFkYS9EZXNrdG9wL2lmLWJvcnJvd2h1Yi9UaGFpVHJhaWwvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL25peWFkYS9EZXNrdG9wL2lmLWJvcnJvd2h1Yi9UaGFpVHJhaWwvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICAgIHBvcnQ6IDUxNzMsXG4gICAgc3RyaWN0UG9ydDogZmFsc2UsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIC8vIFx1MEUyQVx1MEU0OFx1MEUwNyBTZXQtQ29va2llIGhlYWRlciBcdTBFMDhcdTBFMzJcdTBFMDEgYmFja2VuZCBcdTBFMUNcdTBFNDhcdTBFMzJcdTBFMTlcdTBFMjFcdTBFMzJcdTBFMTZcdTBFMzZcdTBFMDcgYnJvd3NlciBcdTBFNDJcdTBFMTRcdTBFMjJcdTBFMTVcdTBFMjNcdTBFMDdcbiAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNjID0gcHJveHlSZXMuaGVhZGVyc1snc2V0LWNvb2tpZSddO1xuICAgICAgICAgICAgaWYgKHNjKSB7XG4gICAgICAgICAgICAgIC8vIFx1MEUyNVx1MEUxQSBEb21haW49IGF0dHJpYnV0ZSBcdTBFMkRcdTBFMkRcdTBFMDFcdTBFNDBcdTBFMUVcdTBFMzdcdTBFNDhcdTBFMkRcdTBFNDNcdTBFMkJcdTBFNDkgYnJvd3NlciBhY2NlcHQgY29va2llIFx1MEUxQVx1MEUxOSBsb2NhbGhvc3RcbiAgICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snc2V0LWNvb2tpZSddID0gc2MubWFwKChjKSA9PlxuICAgICAgICAgICAgICAgIGMucmVwbGFjZSgvO1xccypEb21haW49W147XSovaSwgJycpXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgfVxuICB9XG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQWlWLFNBQVMsb0JBQW9CO0FBQzlXLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUV4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztBQUFBLEVBQ2hDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQTtBQUFBLFFBRVIsV0FBVyxDQUFDLFVBQVU7QUFDcEIsZ0JBQU0sR0FBRyxZQUFZLENBQUMsYUFBYTtBQUNqQyxrQkFBTSxLQUFLLFNBQVMsUUFBUSxZQUFZO0FBQ3hDLGdCQUFJLElBQUk7QUFFTix1QkFBUyxRQUFRLFlBQVksSUFBSSxHQUFHO0FBQUEsZ0JBQUksQ0FBQyxNQUN2QyxFQUFFLFFBQVEscUJBQXFCLEVBQUU7QUFBQSxjQUNuQztBQUFBLFlBQ0Y7QUFBQSxVQUNGLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
