import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
    plugins: [
        typescript(),
    ],
    build: {
        outDir: 'dist',
        lib: {
            entry: 'src/index.ts',
            formats: ['cjs'],
            fileName: () => 'index.js'
        },
        rollupOptions: {
            external: ['aws-sdk'],
        },
        target: 'node20',
        minify: true
    }
});