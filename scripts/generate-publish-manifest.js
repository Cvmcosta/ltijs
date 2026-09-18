const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

const stripDist = value => value.replace(/(\.\/)?dist\//, '$1')

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'))

const publishPkg = { ...pkg }
publishPkg.main = stripDist(pkg.main)
publishPkg.types = stripDist(pkg.types)
publishPkg.exports = {
  '.': {
    types: stripDist(pkg.exports['.'].types),
    default: stripDist(pkg.exports['.'].default),
  },
}
publishPkg.imports = Object.fromEntries(
  Object.entries(pkg.imports).map(([key, value]) => [key, stripDist(value.default)]),
)
delete publishPkg.files
delete publishPkg.publishConfig

fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(publishPkg, null, 2) + '\n')
fs.copyFileSync(path.join(rootDir, 'README.md'), path.join(distDir, 'README.md'))
fs.copyFileSync(path.join(rootDir, 'LICENSE'), path.join(distDir, 'LICENSE'))
