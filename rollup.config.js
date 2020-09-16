/* eslint-disable node/no-unpublished-require */
const typescript = require('rollup-plugin-typescript2');
const dynamicImportVariables = require('rollup-plugin-dynamic-import-variables');
const {terser} = require('rollup-plugin-terser');

const pkg = require('./package.json');

module.exports = {
  input: 'src/index.ts', // our source file
  output: [
    {
      format: 'cjs',
      inlineDynamicImports: true,
    },
  ],
  external: [...Object.keys(pkg.dependencies || {})],
  plugins: [
    typescript({
      typescript: require('typescript'),
    }),
    dynamicImportVariables(),
    terser(), // minifies generated bundles
  ],
};
