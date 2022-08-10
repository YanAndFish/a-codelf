import { defineConfig } from 'tsup'
import { join } from 'path'

export default defineConfig({
  dts: true,
  entry: [join(__dirname, './src/index.ts')],
  bundle: true,
  clean: true,
  splitting: false,
  format: ['cjs', 'esm'],
  legacyOutput: true,
  treeshake: true,
  //minify: true,
})
