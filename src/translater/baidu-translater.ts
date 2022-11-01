import { formatJSONP, MD5 } from '@/util'
import axios, { type AxiosProxyConfig } from 'axios'
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
  translateUrl?: string
}

/**
 * 百度翻译器
 */
export class BaiduTranslater extends Translater {
  private readonly translateAppId: string
  private readonly translateKey: string
  private readonly translateEndpoint: string

  constructor(option: BaiduTranslaterOption, proxy?: AxiosProxyConfig) {
    super('baidu', proxy)
    this.translateAppId = option.translateAppId
    this.translateKey = option.translateKey
    this.translateEndpoint =
      option?.translateUrl ||
      'https://fanyi-api.baidu.com/api/trans/vip/translate'
  }

  private genUrl(query: string): string {
    const translateSalt = Date.now()

    const sign = MD5(
      `${this.translateAppId}${query}${translateSalt}${this.translateKey}`
    ) // appid+q+salt+密钥 的MD5值
    return `${this.translateEndpoint}?callback=?&from=auto&to=en&appid=${
      this.translateAppId
    }&salt=${translateSalt}&q=${encodeURIComponent(query)}&sign=${sign}`
  }

  public async request(query: string): Promise<TranslateResult | null> {
    const cache = this.cache.get(query)
    if (cache) {
      return cache
    }

    try {
      const url = this.genUrl(query)
      const res = formatJSONP(await axios.get(url, { proxy: this.proxy }))
      if (res && res.trans_result) {
        let translation = res.trans_result.map((key: { dst: any }) => key.dst)
        const suggestion = this.formatSuggestionStr(translation.join(' '))
        translation = this.formatTranslationArr(translation)
        const response = {
          suggestion,
          translation,
          translationRaw: [translation],
        } as TranslateResult
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
