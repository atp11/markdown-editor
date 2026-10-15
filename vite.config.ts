import { defineConfig } from 'vite'

// Base path for GitHub Pages project sites: /<repo-name>/
// Override with: VITE_BASE=/ my-custom-path/ npm run build
export default defineConfig({
  base: process.env.VITE_BASE ?? '/markdown-editor/',
})
