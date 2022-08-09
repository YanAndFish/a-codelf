import { formatJSONP, MD5 } from '@/util'
import axios from 'axios'
import { Translater, TranslateResult } from './translater'
/**
 * 特别重要，必读！
 * CODELF 用的是 Baidu 翻译 API 的免费套餐，一个月仅有200万字符请求限制！
 * 所以，如果你想二次开发，请单独申请自己的 Baidu 翻译 API 的 KEY，否则会直接影响 CODELF 的用户。
 * Baidu 翻译 API 申请参看： https://api.fanyi.baidu.com/api/trans/product/apidoc
 */
export interface BaiduTranslaterOption {
  translateAppId: string
  translateKey: string
}

/**
 * 百度翻译器
 */
export class BaiduTranslater extends Translater {
  private readonly translateAppId: string
  private readonly translateKey: string

  constructor(option: BaiduTranslaterOption) {
    super('baidu')
    this.translateAppId = option.translateAppId
    this.translateKey = option.translateKey
  }

  private genUrl(query: string): string {
    const translateSalt = Date.now()
    const translateEndpoint = `https://fanyi-api.baidu.com/api/trans/vip/translate?callback=?&from=auto&to=en&appid=${this.translateAppId}&salt=${translateSalt}`
    const sign = MD5(
      `${this.translateAppId}${query}${translateSalt}${this.translateKey}`
    ) // appid+q+salt+密钥 的MD5值
    return `${translateEndpoint}&q=${encodeURIComponent(query)}&sign=${sign}`
  }

  public async request(query: string): Promise<TranslateResult | null> {
    const cache = this.cache.get(query)
    if (cache) {
      return cache
    }

    try {
      const url = this.genUrl(query)
      const res = formatJSONP(await axios.get(url))
      if (res && res.trans_result) {
        let translation = res.trans_result.map((key: { dst: any }) => key.dst)
        const suggestion = this.formatSuggestionStr(translation.join(' '))
        translation = this.formatTranslationArr(translation)
        const response = { suggestion, translation }
        this.cache.save(query, response)
        return response
      } else {
        throw new Error('Request Baidu translate failed')
      }
    } catch (err) {
      return null
    }
  }
}
