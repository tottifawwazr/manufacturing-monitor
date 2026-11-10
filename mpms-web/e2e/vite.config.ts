import { mergeConfig } from 'vite'
import config from '../vite.config.ts'

export default mergeConfig(config, {
  server: { proxy: { '/api': { target: 'http://127.0.0.1:5187', changeOrigin: true } } },
})
