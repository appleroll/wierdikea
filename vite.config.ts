import { defineConfig } from 'vite'
import Terminal from 'vite-plugin-terminal'

export default defineConfig({
  base: '/supernoneuclid/',
  plugins: [
    Terminal()
  ]
})
