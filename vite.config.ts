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
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three'
          if (/[\\/]node_modules[\\/]@react-three[\\/]/.test(id)) return 'r3f'
          if (
            /[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/.test(
              id,
            )
          )
            return 'react'
          if (/[\\/]node_modules[\\/]katex[\\/]/.test(id)) return 'katex'
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return 'motion'
          return 'vendor'
        },
      },
    },
  },
  server: {
    host: true,
  },
})
