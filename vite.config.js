import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(),    {
    name: 'add-script',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          '</title>',
          '</title>\n    <script type="module" src="/danmaku-websocket.min.js"></script>'
        );
      },
    },
  },]
})
