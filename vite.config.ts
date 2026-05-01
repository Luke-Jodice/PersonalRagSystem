import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdir, readFile } from 'fs/promises'
import { join, resolve } from 'path'

const CHATS_DIR = resolve(__dirname, '../Luke-Claude/Claude-Chats')

function claudeChatsPlugin() {
  const virtualModuleId = 'virtual:claude-chats'
  const resolvedId = '\0' + virtualModuleId

  return {
    name: 'claude-chats-loader',
    resolveId(id: string) {
      if (id === virtualModuleId) return resolvedId
    },
    async load(id: string) {
      if (id !== resolvedId) return

      let files: { filename: string; content: string; size: number }[] = []
      try {
        const entries = await readdir(CHATS_DIR)
        const mdFiles = entries.filter((f) => f.endsWith('.md'))
        files = await Promise.all(
          mdFiles.map(async (filename) => {
            const content = await readFile(join(CHATS_DIR, filename), 'utf-8')
            return { filename, content, size: Buffer.byteLength(content, 'utf-8') }
          })
        )
      } catch {
        // Directory missing or unreadable — start with no default chats
      }

      return `export const claudeChats = ${JSON.stringify(files)};`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), claudeChatsPlugin()],
})
