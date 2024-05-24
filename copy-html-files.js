const fs = require('fs')
const path = require('path')

const srcDir = path.resolve(__dirname, 'src')
const distDir = path.resolve(__dirname, 'dist')

const copyHtmlFiles = (src, dest) => {
  fs.readdirSync(src).forEach((file) => {
    const srcFile = path.join(src, file)
    const destFile = path.join(dest, file)

    if (fs.lstatSync(srcFile).isDirectory()) {
      if (!fs.existsSync(destFile)) {
        fs.mkdirSync(destFile)
      }
      copyHtmlFiles(srcFile, destFile)
    } else if (path.extname(srcFile) === '.html') {
      fs.copyFileSync(srcFile, destFile)
    }
  })
}

copyHtmlFiles(srcDir, distDir)