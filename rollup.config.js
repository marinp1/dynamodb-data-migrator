/* eslint-disable node/no-unpublished-require */
const typescript = require('rollup-plugin-typescript2');
const {terser} = require('rollup-plugin-terser');

const pkg = require('./package.json');

module.exports = {
  input: 'src/index.ts', // our source file
  output: [
    {
      file: 'bundle.js',
      format: 'cjs',
    },
  ],
  external: [...Object.keys(pkg.dependencies || {})],
  plugins: [
    typescript({
      typescript: require('typescript'),
    }),
    terser(), // minifies generated bundles
  ],
};
