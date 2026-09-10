import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiTarget = env.VITE_API_PROXY_TARGET

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      // Arena preview domains are generated per workspace.
      allowedHosts: true,
      // Using a relative API base keeps browser requests on the preview host.
      // Set VITE_API_PROXY_TARGET locally when the backend does not allow CORS.
      proxy: apiTarget
        ? { '/api': { target: apiTarget, changeOrigin: true, secure: false } }
        : undefined,
    },
  }
})
