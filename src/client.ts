import axios from 'axios'
import { SearchLanguage, topProgramLan } from './lang-meta'
import { Store } from './store'
import {
  BaiduTranslater,
  BaiduTranslaterOption,
} from './translater/baidu-translater'
import {
  BingTranslater,
  BingTranslaterOption,
} from './translater/bing-translater'
import { Translater } from './translater/translater'
import {
  YoudaoTranslater,
  YoudaoTranslaterOption,
} from './translater/youdao-translater'
import { isZH, MD5 } from './util'

export interface ACodelfClientOption {
  /**
   * 翻译器配置
   */
  translater?: {
    baidu?: BaiduTranslaterOption
    bing?: BingTranslaterOption
    youdao?: YoudaoTranslaterOption
  }
}

/**
 * ACodelfClient 查询参数
 */
export interface QueryOption {
  /**
   * 查询内容
   */
  query: string
  /**
   * 页码
   * @default 1
   */
  page?: number
  /**
   * 偏好代码语言
   */
  lang?: SearchLanguage[]
}

/**
 * 代码仓库查询结果
 */
interface RepoResult {
  /** 关键词 */
  keyword: string
  /** 仓库地址 */
  repoLink: string
  /** 仓库语言 */
  repoLang: SearchLanguage | 'Unknown'
}

/**
 * 变量查询结果
 */
export interface VariableResult {
  /** 搜索值 */
  searchValue: string
  /** 页码 */
  page: number
  /** 变量名称列表 */
  variableList: RepoResult[]
  /** 搜索偏好语言 */
  searchLang: string[]
  /** 建议列表 */
  suggestion: string[]
  /** 是否为中文源语言查询 */
  isZH: boolean
}

/**
 * ACodelfClient 客户端
 */
export class ACodelfClient {
  /** 翻译器列表 */
  private readonly translaters: Translater[] = []

  /** 变量列表缓存 */
  private readonly variableListStore = new Store(
    Infinity,
    'session',
    'variable_list_key'
  )

  constructor(private readonly option: ACodelfClientOption) {
    if (option?.translater?.youdao) {
      this.translaters.push(new YoudaoTranslater(option.translater.youdao))
    }
    if (option?.translater?.baidu) {
      this.translaters.push(new BaiduTranslater(option.translater.baidu))
    }
    if (option?.translater?.bing) {
      this.translaters.push(new BingTranslater(option.translater.bing))
    }
  }

  /**
   * 解析建议
   * @param keywords 关键词列表
   * @param curSuggestion 当前建议
   * @returns
   */
  private parseSuggestion(
    keywords: string[],
    curSuggestion: string[] = []
  ): string[] {
    const suggestion = curSuggestion
    if (keywords) {
      suggestion.unshift(...keywords)
    }
    return [...new Set(suggestion)].filter(item => !isZH(item))
  }

  /**
   * 解析请求参数
   * @param val
   * @returns
   */
  private parseQueryOption(val: unknown): QueryOption {
    if (typeof val === 'string') {
      return {
        query: val,
        page: 1,
      }
    } else {
      return val as QueryOption
    }
  }

  private getTranslator(): Translater | null {
    const translator = this.translaters.shift()
    if (translator) {
      this.translaters.push(translator)
      return translator
    }
    return null
  }

  /**
   * 处理代码仓库请求结果
   * @param results
   * @param keywords
   * @returns
   */
  private parseVariableList(results: any[], keywords: any): RepoResult[] {
    const vals: string[] = []
    const variables: RepoResult[] = []
    results.forEach(res => {
      res.repo = res.repo.replace('git://github.com', 'https://github.com')
      //filter codes
      const lineStr = Object.keys(res.lines)
        .reduce((accu, line) => {
          const lstr = res.lines[line]
          //no base64
          if (!(/;base64,/g.test(lstr) && lstr.length > 256)) {
            return accu.concat(lstr)
          }
          return accu
        }, [])
        .join('')
        .replace(/\r\n/g, ' ') // remove \r\n
      //match variables
      this.getKeyWroddRegs(keywords).forEach(reg => {
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(lineStr.match(reg) || []).forEach(val => {
          //remove "-" and "/" from the start and the end
          // eslint-disable-next-line no-useless-escape
          val = val.replace(/^(\-|\/)*/, '').replace(/(\-|\/)*$/, '')
          if (
            !/\//g.test(val) /*exclude links*/ &&
            vals.indexOf(val) === -1 &&
            vals.indexOf(val.toLowerCase()) === -1 &&
            vals.indexOf(val.toUpperCase()) === -1 &&
            val.length < 64 /*too long*/
          ) {
            vals.push(val)
            variables.push({
              keyword: val,
              repoLink: res.repo,
              repoLang: res.language,
            })
          }
        })
      })
    })
    return variables
  }

  /**
   * 获取关键词查找正则
   * @param keyword 关键词
   * @returns
   */
  private getKeyWordReg(keyword: string): RegExp {
    return new RegExp(
      '([\\-_\\w\\d\\/\\$]{0,}){0,1}' + keyword + '([\\-_\\w\\d\\$]{0,}){0,1}',
      'gi'
    )
  }

  /**
   * 获取关键词查找正则列表
   * @param keywords
   * @returns
   */
  private getKeyWroddRegs(keywords: string): RegExp[] {
    return keywords.split(' ').reduce<RegExp[]>((accumulator, curr) => {
      if (curr.length && curr.length > 1) {
        return accumulator.concat(this.getKeyWordReg(curr))
      }
      return accumulator
    }, [])
  }

  /**
   * 搜索代码仓库查找变量
   * @param query 查询内容
   * @param page 页码
   * @param lang 偏好语言
   * @returns
   */
  private async searchCode(
    query: string,
    page: number,
    lang: SearchLanguage[]
  ): Promise<RepoResult[]> {
    if (!query) {
      return []
    }

    // 转换语言名称到编码
    const _lang = lang
      .map((l: SearchLanguage) => topProgramLan[l])
      .filter(l => !!l)

    const langParams = lang.length
      ? '&lan=' + _lang.join(',').split(',').join('&lan=')
      : ''
    const qParams = query.replace(' ', '+')
    const url = `https://searchcode.com/api/codesearch_I/?callback=?&q=${qParams}&p=${page}&per_page=42${langParams}`

    const res = (await axios.get(url)).data
    if (!res.results) {
      return []
    }
    return this.parseVariableList(res.results, query)
  }

  /**
   * 请求翻译变量名称
   * @param queryOption 查询参数
   */
  public async requestVariable(
    queryOption: QueryOption
  ): Promise<VariableResult>
  /**
   * 请求翻译变量名称
   * @param query 查询内容
   */
  public async requestVariable(query: string): Promise<VariableResult>
  public async requestVariable(val: unknown): Promise<VariableResult> {
    // 查询参数
    const queryOption = this.parseQueryOption(val)

    // 返回结果
    const res: VariableResult = {
      isZH: false,
      page: queryOption.page || 1,
      searchLang: queryOption.lang || [],
      searchValue: queryOption.query,
      suggestion: [],
      variableList: [],
    }

    if (queryOption.query !== undefined && queryOption.query !== null) {
      queryOption.query = queryOption.query.trim().replace(/\s+/gi, ' ') // filter spaces
    }
    if (queryOption.query.length < 1) {
      return res
    }

    // 更新中文输入标识
    res.isZH = isZH(queryOption.query)

    let suggestion = this.parseSuggestion(queryOption.query.split(''))

    // 查询值
    let _query = queryOption.query

    // 更新中文的查询值
    if (res.isZH) {
      const translator = this.getTranslator()
      if (!translator) {
        throw new Error('输入为中文，但没有找到翻译器')
      }
      const translate = await translator.request(queryOption.query)
      if (translate) {
        _query = translate.translation || ''
        suggestion = this.parseSuggestion(translate.suggestion, suggestion)
        suggestion = this.parseSuggestion(_query.split(' '), suggestion)
      }
    }
    res.suggestion = suggestion

    // 尝试从缓存搜索结果
    const cacheId = MD5(
      _query +
        queryOption.page +
        (queryOption.lang && queryOption.lang.length
          ? queryOption.lang.join(',')
          : '')
    )
    const cache = this.variableListStore.get(cacheId)
    if (cache) {
      return cache
    }

    // 搜索代码
    const repoResult = await this.searchCode(
      _query,
      queryOption.page || 1,
      queryOption.lang || []
    )

    res.variableList = repoResult

    // 将搜索结果缓存起来
    this.variableListStore.save(cacheId, res)

    return res
  }
}

/**
 * 创建 ACodelfClient 客户端
 * @param option 选项
 * @returns
 */
export function createACodelf(
  option: ACodelfClientOption
): () => ACodelfClient {
  const client = new ACodelfClient(option)
  return () => client
}
