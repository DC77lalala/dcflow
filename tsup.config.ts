import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
