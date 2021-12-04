const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const rollup = require('rollup')
const terser = require('terser')

// 创建dict目录
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist')
}

// 获取所有构建配置
let builds = require('./config').getAllBuilds()

// filter builds via command line arg
if (process.argv[2]) {
  // yarn build:ssr | yarn build:weex
  const filters = process.argv[2].split(',')
  builds = builds.filter(b => {
    return filters.some(f => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1)
  })
} else {
  // filter out weex builds by default
  // 不传参默认过滤掉weex的构建配置 yarn build
  builds = builds.filter(b => {
    return b.output.file.indexOf('weex') === -1
  })
}

build(builds)

/**
 * 构建所有配置
 * @param {Array} builds 
 */
 function build (builds) {
  let built = 0
  const total = builds.length
  const next = () => {
    buildEntry(builds[built]).then(() => {
      built++
      if (built < total) {
        // 递归，直至所有的配置完成代码构建
        next()
      }
    }).catch(logError)
  }

  next()
}

/**
 * 根据构建配置rollup构建
 * @param {*} config rollup构建配置 
 * @returns 
 */
function buildEntry (config) {
  const output = config.output
  const { file, banner } = output
  const isProd = /(min|prod)\.js$/.test(file)
  return rollup.rollup(config)
    .then(bundle => bundle.generate(output))
    .then(({ output: [{ code }] }) => {
      if (isProd) {
        // 生产环境压缩代码
        const minified = (banner ? banner + '\n' : '') + terser.minify(code, {
          toplevel: true,
          output: {
            ascii_only: true
          },
          compress: {
            pure_funcs: ['makeMap']
          }
        }).code
        // 写入文件
        return write(file, minified, true)
      } else {
        return write(file, code)
      }
    })
}

/**
 * 将打包code写入到指定文件中 并输出日志
 * @param {*} dest 文件名 即 output
 * @param {*} code 生成的代码字符串
 * @param {*} zip  写文件后report是否显示zip后size
 * @returns 
 */
function write (dest, code, zip) {
  return new Promise((resolve, reject) => {
    // ouput 文件 + size 日志输出
    function report (extra) {
      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))
      resolve()
    }

    fs.writeFile(dest, code, err => {
      if (err) return reject(err)
      if (zip) {
        // gzip压缩后尺寸报告
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        report()
      }
    })
  })
}

function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

function logError (e) {
  console.log(e)
}

function blue (str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
