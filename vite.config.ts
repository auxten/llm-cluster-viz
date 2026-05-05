import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('three/') || id.includes('three\\')) return 'three'
            if (id.includes('@react-three')) return 'r3f'
            if (id.includes('react-dom') || id.includes('/react/')) return 'react'
            if (id.includes('katex')) return 'katex'
            if (id.includes('framer-motion')) return 'motion'
            return 'vendor'
          }
        },
      },
    },
  },
  server: {
    host: true,
  },
})
