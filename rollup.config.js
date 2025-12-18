import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true
  },
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json'
    })
  ],
  external: [
    '@codemirror/language',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/lr',
    '@lezer/highlight'
  ]
};
