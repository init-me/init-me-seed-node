const inquirer = require('inquirer')
const extOs = require('yyl-os')
const fs = require('fs')
const path = require('path')
// const rp = require('yyl-replacer')
const print = require('yyl-print')

const SEED_PATH = path.join(__dirname, './seeds')

const lang = {
  QUEATION_SELECT_TYPE: '请选择构建方式',
  QUESTION_NAME: '项目名称',

  TYPE_ERROR: 'env.type 不存在',

  FORMAT_FILE_START: '正在格式化文件',
  FORMAT_FILE_FINISHED: '格式化文件 完成',

  INSTALL_START: '正在安装依赖',
  INSTALL_FINISHED: '安装依赖 完成'
}

let initData = {
  name: '',
  type: '',
  pkgExists: false
}

const config = {
  path: './seeds/base',
  hooks: {
    /**
     * seed 包执行前 hooks
     * 可以通过 inquirer 配置成多个 seed 包
     * @param  targetPath: string 复制目标路径 cwd
     * @param  env       : {[argv: string]: string} cmd 参数
     * @return Promise<any>
     * beforeStart({env, targetPath})
     */
    async beforeStart({ env }) {
      const questions = []

      // + type
      const types = fs.readdirSync(SEED_PATH).filter((iPath) => {
        return !(/^\./.test(iPath))
      })
      if (types.length === 1) {
        initData.type = types[0]
      } else {
        if (env && env.type) {
          if (types.indexOf(env.type) !== -1) {
            initData.type = env.type
          } else {
            throw new Error(`${lang.TYPE_ERROR}: ${env.type}`)
          }
        } else {
          questions.push({
            type: 'list',
            name: 'type',
            message: `${lang.QUEATION_SELECT_TYPE}:`,
            default: types[0],
            choices: types
          })
        }
      }
      // - type

      if (questions.length) {
        const r = await inquirer.prompt(questions)
        if (r.name) {
          initData = Object.assign(initData, r)
        }
      }

      config.path = path.join(SEED_PATH, initData.type)
    },
    /**
     * 复制操作前 hooks
     * 可以在此执行重命名，调整模板路径操作
     * @param  fileMap   : {[oriPath: string]: string[]} 复制操作映射表
     * @param  targetPath: string 复制目标路径 cwd
     * @param  env       : {[argv: string]: string} cmd 参数
     * @return Promise<fileMap>
     * beforeCopy({fileMap, targetPath})
     */
    beforeCopy({fileMap, targetPath, env}) {
      if (env.silent) {
        print.log.setLogLevel(0)
      }
      fileMap[path.join(config.path, 'gitignore')] = [
        path.join(targetPath, '.gitignore')
      ]

      fileMap[path.join(config.path, 'npmignore')] = [
        path.join(targetPath, '.npmignore')
      ]

      const pkgPath = path.join(targetPath, 'package.json')
      const oPkgPath = path.join(config.path, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const oPkg = require(oPkgPath)
        const pkg = require(pkgPath)
        const rPkg = Object.assign(pkg, oPkg)
        fs.writeFileSync(pkgPath, JSON.stringify(rPkg, null, 2))
        print.log.update(pkgPath)
        if (fileMap[oPkgPath]) {
          delete fileMap[oPkgPath]
        }
        initData.pkgExists = true
      }

      return Promise.resolve(fileMap)
    },
    /**
     * 复制操作后 hooks
     * 可以在在此执行 项目初始化如 npm install 操作
     * @param  fileMap   : {[oriPath: string]: string[]} 复制操作映射表
     * @param  targetPath: string 复制目标路径 cwd
     * @param  env       : {[argv: string]: string} cmd 参数
     * @return Promise<any>
     * afterCopy({fileMap, targetPath, env })
     */
    async afterCopy({targetPath, env}) {
      const installPath = [
        path.join(targetPath)
      ]
      await extOs.runSpawn('yarn init', installPath[0])

      print.log.info(lang.INSTALL_START)
      await extOs.runCMD('yarn install', installPath[0])
      print.log.success(lang.INSTALL_FINISHED)
    }
  }
}

module.exports = config