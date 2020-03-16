const { FuseBox, QuantumPlugin } = require('fuse-box')

const fuse = FuseBox.init({
  homeDir: 'src',
  output: 'dist/$name.js',
  target: 'server@esnext',
  cache: false,
  globals: { default: '*' },
  plugins: [
    QuantumPlugin({
      ensureES5: false,
      treeshake: true,
      uglify: false,
      bakeApiIntoBundle: true,
      containedAPI: true
    })
  ]
})

fuse.bundle('actions-codegen').instructions(' > index.ts')
fuse.run()
