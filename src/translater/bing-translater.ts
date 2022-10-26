import axios, { type AxiosProxyConfig } from 'axios'
import { Translater, TranslateResult } from './translater'

export interface BingTranslaterOption {
  translateKey: string
  translateUrl?: string
}

/**
 * 特别重要，必读！
 * CODELF 用的是 Bing 翻译 API 的免费套餐，一个月仅有200万字符请求限制！
 * 所以，如果你想二次开发，请单独申请自己的 Bing 翻译 API 的 KEY，否则会直接影响 CODELF 的用户。
 * Bing 翻译 API 申请参看： https://docs.microsoft.com/en-us/azure/cognitive-services/translator/
 * https://docs.microsoft.com/en-us/azure/cognitive-services/translator/reference/v3-0-translate
 */
// curl -X POST "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=en" -H "Ocp-Apim-Subscription-Key: 445fd33be8764339add46f0770ac617d" -H "Content-Type: application/json; charset=UTF-8" -d "[{'Text':'咸鱼'}]"
export class BingTranslater extends Translater {
  private readonly translateKey: string
  private readonly translateEndpoint: string
  constructor(option: BingTranslaterOption, proxy?: AxiosProxyConfig) {
    super('bing', proxy)
    this.translateKey = option.translateKey
    this.translateEndpoint =
      option?.translateUrl ||
      'https://api.cognitive.microsofttranslator.com/translate'
  }

  public async request(query: string): Promise<TranslateResult | null> {
    const cache = this.cache.get(query)
    if (cache) {
      return cache
    }

    try {
      const res = (
        await axios.post(
          `${this.translateEndpoint}?api-version=3.0&to=en`,
          query.split(' ').map(text => {
            return { Text: text }
          }),
          {
            headers: {
              'Ocp-Apim-Subscription-Key': this.translateKey,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            proxy: this.proxy,
          }
        )
      ).data
      if (res) {
        let suggestionStr = ''
        let suggestion = null
        let translation: any = []

        res.forEach((key: { translations: any[] }) => {
          const trans = key.translations.map(t => t.text)
          suggestionStr += ' ' + trans.join(' ')
          Array.prototype.push.apply(translation, trans)
        })

        suggestion = this.formatSuggestionStr(suggestionStr)
        if (translation) {
          translation = this.formatTranslationArr(translation)
        }
        const response = { suggestion, translation }
        this.cache.save(query, response)
        return response
      } else {
        throw new Error('Request Bing translate failed')
      }
    } catch (err) {
      return null
    }
  }
}
