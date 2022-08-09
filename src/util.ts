import type { AxiosResponse } from 'axios'

import { MD5 as _MD5, SHA256 as _SHA256 } from 'crypto-js'

/**
 * 生成MD5
 * @param str 目标字符串
 * @returns
 */
export function MD5(str: string): string {
  return _MD5(str).toString()
}

/**
 * 生成SHA256
 * @param str 目标字符串
 * @returns
 */
export function SHA256(str: string): string {
  return _SHA256(str).toString()
}

/**
 * 格式化JSONP的返回结果
 * @param res AxiosResponse
 * @returns
 */
export function formatJSONP<R = any>(res: AxiosResponse<any, any>): R {
  if (
    res.headers['content-type'] === 'application/json' &&
    typeof res.data === 'string'
  ) {
    try {
      const match = res.data.trim().match(/^\?\((.*)\)$/)
      return JSON.parse(match?.[1] ?? res.data.trim())
    } catch {
      return res.data as unknown as R
    }
  } else {
    return res.data
  }
}

/**
 * 判断目标字符串是否为中文
 * @param target 目标字符串
 * @returns
 */
export function isZH(target: string): boolean {
  let isZH = false
  target
    .replace(/\s+/gi, '+')
    .split('+')
    .forEach(key => {
      // eslint-disable-next-line no-control-regex
      if (/[^\x00-\xff]/gi.test(key)) {
        isZH = true
      }
    })
  return isZH
}
