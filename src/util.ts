import type { AxiosResponse } from 'axios'

import { MD5 as _MD5, SHA256 as _SHA256 } from 'crypto-js'

export function MD5(str: string): string {
  return _MD5(str).toString()
}

export function SHA256(str: string): string {
  return _SHA256(str).toString()
}

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
