import { SHA256 } from '@/util'
import axios from 'axios'
import { Translater, TranslateResult } from './translater'
import { stringify } from 'qs'

export interface YoudaoTranslaterOption {
  appId: string
  appKey: string
}

/**
 * 特别重要，必读！
 * CODELF 用的是有道翻译 API 的免费套餐，1小时仅有1K的请求次数限制！
 * 所以，如果你想二次开发，请单独申请自己的有道翻译 API 的 KEY，否则会直接影响 CODELF 的用户。
 * 有道翻译 API 申请参看： http://fanyi.youdao.com/openapi?path=data-mode
 */
export class YoudaoTranslater extends Translater {
  private readonly appId: string
  private readonly appKey: string

  constructor(option: YoudaoTranslaterOption) {
    super('youdao')
    this.appId = option.appId
    this.appKey = option.appKey
  }

  private truncate(query: string): string {
    const len = query.length
    if (len <= 20) return query
    return query.substring(0, 10) + len + query.substring(len - 10, len)
  }

  public async request(query: string): Promise<TranslateResult | null> {
    const cache = this.cache.get(query)
    if (cache) {
      return cache
    }
    const translateEndpoint = 'https://openapi.youdao.com/api'
    const salt = Date.now()
    const curtime = Math.round(new Date().getTime() / 1000)

    try {
      const data = (
        await axios.post(
          translateEndpoint,
          stringify({
            from: 'auto',
            to: 'en',
            appKey: this.appId,
            salt,
            sign: SHA256(
              `${this.appId}${this.truncate(query)}${salt}${curtime}${
                this.appKey
              }`
            ),
            signType: 'v3',
            curtime,
            q: query,
          }),
          {
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
          }
        )
      ).data

      let suggestionStr = ''
      let suggestion = null
      let translation: any = []
      //basic translate
      if (data.basic && data.basic.explains) {
        suggestionStr += data.basic.explains.join(' ')
        translation = suggestionStr
      }
      //web translate
      if (data.web && data.web) {
        data.web.forEach((key: { value: any[] }) => {
          suggestionStr += ' ' + key.value.join(' ')
        })
      }
      suggestion = this.formatSuggestionStr(suggestionStr)
      if (data && data.translation) {
        translation = this.formatTranslationArr(data.translation)
      }
      const response = { suggestion, translation }
      this.cache.save(query, response)
      return response
    } catch (e) {
      return null
    }
  }
}
