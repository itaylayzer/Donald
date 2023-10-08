import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base:"/Donald/",
  resolve:{
    alias: {
      '#Donald': '/src',
      '#Kart': '/src/Screens/Kart',
      '#Mii': '/src/Screens/Mii',
    },
  }
})
