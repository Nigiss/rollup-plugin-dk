import fs from 'fs';

const fileCache = {};
const includesReg = /include\s*\(\[([\s\S]+)\]\)\s*;?/;

function nonNullFilter (item) {
  return !!item
}

function readFile (path) {
  return fileCache[path] || (fileCache[path] = fs.readFileSync(path, 'utf8'))
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
  const match = cnt.match(includesReg);
  if (!match) return []
  return match[1].split(',').map(line => {
    if (!line.trim()) {
      return
    }
    return line.match(/\s*['"]([^'"]+)['"]\s*/)[1]
  }).filter(nonNullFilter).map(path => dir + path)
}

function parseExports (cnt) {
  if (needParse(cnt)) {
    return null
  }

  // 解析exported语法：/* exported chList__entry */
  let reg = /\/\*\s+exported\s+(\w+)\s+\*\//;
  var exports = (cnt.match(new RegExp(reg, 'g')) || []).map(exported => reg.exec(exported)[1]);

  if (exports.length) return exports

  // 没有exported 函数时，将所有的函数都暴露
  let regStr = '^function\\s+(\\w+)';
  let match = cnt.match(new RegExp(regStr, 'mg'));

  // 没有函数
  if (!match) return null

  return match.map(m => m.match(regStr)[1])
}

function removeIncludes (cnt) {
  return cnt.replace(/include\(\[[\s\S]+?\]\)\s*;\s*/, '')
}

function generateImports (paths) {
  return paths.map(path => {
    var exportFns = parseExports(readFile(path));
    if (!exportFns) return null

    return `import { ${exportFns.join(', ')} } from '${path}';`
  }).filter(nonNullFilter).join('\n')
}

function generateExports (fns) {
  return `export {\n    ${fns.join(',\n    ')}\n}`
}

/* eslint-disable */
var transform = function (tmpl) {
  function unescape(code) {
    return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
  }

  var c = {

    func :       /{{#\s*([\w$]+)\s*(\([^)]*\)|)\s*}}([\s\S]*?){{#}}/g,
    evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
    interpolate: /\{\{=([\s\S]+?)\}\}/g,
    conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
    transclude:  /\{\{\-(\-)?\s*([\s\S]*?)\s*\}\}/g,
    iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
  };
  var cse = {
    start: "'+(",
    end: ")+'"
  }, sid = 0, indv;

  // 只替换{{#func()}}{{#}}里面的内容
  tmpl = tmpl.replace(c.func, function(m, def, args, str) {
    // 转译特殊字符，在html拼接的时候出现语法错误
    str = str.replace(/('|\\)/g, '\\$1');
    // 干掉所有空白符, 通过连字符解决，保持文件格式
    //str = str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,"")
    //.replace(/\r|\n|\t/g,"")
    // 拼接方法名
    str = "function " + def + (args || "()") + " {var out='" + str;
    // 替换各种标志符
    str = str
      .replace(c.interpolate, function(m, code) {
        return cse.start + unescape(code) + cse.end;
      })
      .replace(c.conditional, function(m, elsecase, code) {
        return elsecase ?
          (code ? "';}else if(" + unescape(code) + ") {out+='" : "';}else {out+='") :
        (code ? "';if(" + unescape(code) + ") {out+='" : "';}out+='");
      })
      .replace(c.transclude, function(m, elsecase, code) {
        function formatCode() {
          if (!/\)$/.test(code)) {
            // {{-page}}, 无argsBody
            code = code + '(';
          } else if (/\(\s*\)$/.test(code)) {
            // {{-bem(page)()}}, 有body, 但是最后一个是空括号
            code = code.substr(0, code.length - 1);
          } else {
            // {{-bem(page)(1)}}, 有body, 也有内容
            code = code.substr(0, code.length - 1) + ',';
          }
          return code;
        }
        return elsecase ?
          "';return out;})(), (function() {var out='';out+='":
                                               (code ? "';out+=" + unescape(formatCode()) + "(function() {var out=''; out+='" : "';return out;})());out+='");
      })
                                               .replace(c.iterate, function(m, iterate, vname, iname) {
                                                 if (!iterate) return "';} } out+='";
                                                 sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
                                                 return "';var arr"+sid+"="+iterate+";if(arr"+sid+") {var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+") {"
                                                   +vname+"=arr"+sid+"["+indv+"+=1];out+='";
                                               })
      .replace(c.evaluate, function(m, code) {
        // 因为此处是js, 所以需要将特殊字符转回来
        return "';" + unescape(code) + "out+='";
      })
      .replace(/(\s|;|\}|^|\{)out\+='';/g, "$1").replace(/\+''/g, "");
    // 拼接方法结尾
    str = str + "';return out;}";
    // 把所有字符串链接起来, 并且保持行数不变
    str = str.replace(/(\r|\n|\r\n)/g, '\\\n');
    return str;
  });
  return tmpl;
};

function getCurrDir (path) {
  return path.replace(/(.*\/)(.*)/, '$1')
}

var index = function () {
  return {
    name: 'dk',
    load (id) {
      let cnt = readFile(Array.isArray(id) ? id[0] : id);
      if (needParse(cnt)) {
        return cnt
      }

      let currDir = getCurrDir(id);
      let includePaths = parseIncludes(currDir, cnt);
      let exportedFns = parseExports(cnt);
      let code = `${generateImports(includePaths)}\n${removeIncludes(cnt)}\n${generateExports(exportedFns)}`;
      return transform(code)
    }
  }
};

export default index;
//# sourceMappingURL=rollup-plugin-dk.es.js.map
