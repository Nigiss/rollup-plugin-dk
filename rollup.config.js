const pkg = require('./package.json')

export default {
  entry: 'src/index.js',
  external: pkg.builtins.concat(Object.keys(pkg.dependencies)),
  targets: [
    { dest: pkg.main, format: 'cjs' },
    { dest: pkg['jsnext:main'], format: 'es' }
  ],
  sourceMap: true
}
