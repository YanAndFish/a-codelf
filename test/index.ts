/* eslint-disable @typescript-eslint/no-unused-vars */
// import { ACodelfClientOption, createACodelf } from '../src/client'
// import { BaiduTranslater } from '../src/translater/baidu-translater'
// import { BingTranslater } from '../src/translater/bing-translater'
import 'dotenv/config'
// import { MD5 } from '../src/util'
// import { YoudaoTranslater } from '../src/translater/youdao-translater'

import { createACodelf, ACodelfClientOption } from '../dist'

const option: ACodelfClientOption = {
  translater: {
    baidu: {
      translateAppId: process.env.baidu_translateAppId!,
      translateKey: process.env.baidu_translateKey!,
    },
    bing: {
      translateKey: process.env.bing_translateKey!,
    },
    youdao: {
      appId: process.env.youdao_appId!,
      appKey: process.env.youdao_appKey!,
    },
  },
  cache: {
    expire: Infinity,
    storageType: 'memory',
  },
}

//const baidu = new BaiduTranslater(option.translater?.baidu!)
//const bing = new BingTranslater(option.translater?.bing!)
//const youdao = new YoudaoTranslater(option.translater?.youdao!)
//youdao.request('篮球').then(console.log)

// const str = '篮球' // ea2eed1fb5e122c77dfe68eec3616839
// const md5 = MD5(str)

// console.log('md5:', md5, 'pass?:', md5 === 'ea2eed1fb5e122c77dfe68eec3616839')

const useClient = createACodelf(option)

useClient()
  .requestVariable({
    query: '摄像头',
    lang: [],
  })
  .then(res => {
    console.log(res)
  })
