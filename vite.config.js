import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages 使用项目子路径，统一处理静态资源和简历入口。
  base: '/personal-page/',
  plugins: [react()],
})
