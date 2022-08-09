import { BaiduTranslaterOption } from './translater/baidu-translater'
import { BingTranslaterOption } from './translater/bing-translater'
import { YoudaoTranslaterOption } from './translater/youdao-translater'

export interface ACodelfClientOption {
  translater?: {
    baidu?: BaiduTranslaterOption
    bing?: BingTranslaterOption
    youdao?: YoudaoTranslaterOption
  }
}

export class ACodelfClient {
  constructor(option: ACodelfClientOption) {}
}

export function createACodelf(option: ACodelfClientOption): ACodelfClient {
  return new ACodelfClient(option)
}
