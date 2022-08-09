import { Store } from '@/store'

/** 翻译返回结果 */
export interface TranslateResult {
  suggestion: string[]
  translation: string | null
}

/**
 * 翻译器
 */
export abstract class Translater {
  protected readonly cache: Store

  constructor(storagePrefix?: string) {
    this.cache = new Store(Infinity, 'session', storagePrefix)
  }

  /**
   * 格式化建议的字符串
   * @param str
   * @returns
   */
  protected formatSuggestionStr(str: string): string[] {
    if (!str) {
      return []
    }
    const tmp: string[] = []
    return str
      .replace(
        // eslint-disable-next-line no-useless-escape
        /[`~!@#$^&*()=|{}':;',\[\].<>\/?~！@#￥……&*（）——|\\{\\}【】‘；：”“’。，、？]/g,
        ' '
      )
      .replace(/\s+/gi, '+')
      .split('+')
      .filter((key, idx, inputArray) => {
        const checked =
          key.length > 1 &&
          inputArray.indexOf(key) === idx &&
          // eslint-disable-next-line no-control-regex
          !/[^\x00-\xff]/gi.test(key) &&
          !tmp.find(ikey => {
            return new RegExp('^' + key + '$', 'ig').test(ikey)
          })
        if (checked) {
          tmp.push(key)
        }
        return checked
      })
  }

  /**
   * 格式化翻译结果
   * @param arr 翻译结果数组
   * @returns
   */
  protected formatTranslationArr(arr: string[]): string | null {
    if (!arr) {
      return null
    }
    return (
      arr
        .join(' ')
        // eslint-disable-next-line no-useless-escape
        .replace(/[!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/g, '')
        .split(' ')
        .filter((key: string, idx: number, inputArray: string[]) => {
          return inputArray.indexOf(key) === idx && !/^(a|an|the)$/gi.test(key)
        })
        .join(' ')
    )
  }

  public abstract request(query: string): Promise<TranslateResult | null>
}
