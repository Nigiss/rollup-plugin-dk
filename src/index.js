import {
  readFile,
  needParse,
  removeIncludes,
  parseIncludes,
  parseExports,
  generateImports,
  generateExports
} from './parse'
import transform from './transform-tpl'

function getCurrDir (path) {
  return path.replace(/(.*\/)(.*)/, '$1')
}

export default function () {
  return {
    name: 'dk',
    load (id) {
      let cnt = readFile(Array.isArray(id) ? id[0] : id)
      if (needParse(cnt)) {
        return cnt
      }

      let currDir = getCurrDir(id)
      let includePaths = parseIncludes(currDir, cnt)
      let exportedFns = parseExports(cnt)
      let code = `${generateImports(includePaths)}\n${removeIncludes(cnt)}\n${generateExports(exportedFns)}`
      return transform(code)
    }
  }
}
