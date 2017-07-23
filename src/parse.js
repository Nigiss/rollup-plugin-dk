import fs from 'fs'
import path from 'path'

const fileCache = {}
const fileImportDict = {}
const includesReg = /include\s*\(\[([^\]]+)\]\)\s*;?/

function nonNullFilter (item) {
  return !!item
}

function readFile (filepath) {
  return fileCache[filepath] || (fileCache[filepath] = fs.readFileSync(filepath, 'utf8'))
}

function isEs6Code (cnt) {
  return !!cnt.match(/import.*?from/) || !!cnt.match(/export.*?\{[^}]+\}/)
}

function hasInclude (cnt) {
  return includesReg.test(cnt)
}

function needParse (cnt) {
  // es6 module无需解析
  // 但是es6 module 和 include 混用时要解析
  if (isEs6Code(cnt) && !hasInclude(cnt)) {
    return true
  }

  return false
}

function parseIncludes (dir, cnt) {
  const match = cnt.match(includesReg)
  if (!match) return []
  return match[1].split(',').map(line => {
    if (!line.trim()) {
      return
    }
    return line.match(/\s*['"]([^'"]+)['"]\s*/)[1]
  }).filter(nonNullFilter).map(filepath => path.normalize(dir + filepath))
}

function parseExports (cnt) {
  if (needParse(cnt)) {
    return null
  }

  // 解析exported语法：/* exported chList__entry */
  let reg = /\/\*\s+exported\s+(\w+)\s+\*\//
  var exports = (cnt.match(new RegExp(reg, 'g')) || []).map(exported => reg.exec(exported)[1])

  if (exports.length) return exports

  // 没有exported 函数时，将所有的函数都暴露
  let regStr = '^function\\s+(\\w+)'
  let match = cnt.match(new RegExp(regStr, 'mg'))

  // 没有函数
  if (!match) return null

  return match.map(m => m.match(regStr)[1])
}

function removeIncludes (cnt) {
  return cnt.replace(/include\(\[[\s\S]+?\]\)\s*;\s*/, '')
}

function generateImports (dir, paths) {
  return paths.map(filepath => {
    let exportFns = parseExports(readFile(filepath))
    if (!exportFns) return null

    let imports = exportFns.map(fnStr => {
      fileImportDict[dir] = fileImportDict[dir] || {}
      fileImportDict[dir][fnStr] = (fileImportDict[dir][fnStr] + 1) || 1

      // 除第一次import外，都需要改变函数名
      var occur = fileImportDict[dir][fnStr]
      if (occur === 1) {
        return fnStr
      }

      return `${fnStr} as ${fnStr}__TEMP__${occur}`
    }).join(', ')
    return `import { ${imports} } from '${filepath}';`
  }).filter(nonNullFilter).join('\n')
}

function generateExports (fns) {
  return `export {\n    ${fns.join(',\n    ')}\n}`
}

export {
  readFile,
  needParse,
  removeIncludes,
  parseIncludes,
  parseExports,
  generateImports,
  generateExports
}
