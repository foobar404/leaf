import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? 'https://foobar404.github.io/leaf/' : './',
}))
