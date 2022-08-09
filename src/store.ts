import { MD5 } from './util'

const storagePrefix = 'ACODELF_' as const

class MemoryStorage implements Storage {
  private storage = new Map<string, string>()
  private static instance: MemoryStorage | null = null

  /**
   * 内存存储实例全局单例，请使用`MemoryStorage.inject()`方法注入
   */
  private constructor() {}

  public static inject(): MemoryStorage {
    this.instance = this.instance ?? new MemoryStorage()
    return this.instance as MemoryStorage
  }

  clear(): void {
    this.storage.clear()
  }
  getItem(key: string): string | null {
    return this.storage.get(key) ?? null
  }
  key(index: number): string | null {
    const keys = this.storage.keys()
    for (const k of keys) {
      if (index === 0) {
        return k
      }
      index--
    }
    return null
  }
  removeItem(key: string): void {
    this.storage.delete(key)
  }
  setItem(key: string, value: string): void {
    this.storage.set(key, value)
  }

  get length(): number {
    return this.storage.size
  }
}

/**
 * Storage interface for the application.
 */
export class StorageImpl {
  private readonly storage: Storage
  public readonly storageType: 'local' | 'session' | 'memory' | 'custom'

  constructor(storage: Storage)
  constructor(storageType: 'local' | 'session' | 'memory')
  constructor(arg: unknown = 'memory') {
    if (typeof arg === 'function' || typeof arg === 'object') {
      this.storage = arg as Storage
      this.storageType = 'custom'
    } else if (
      arg === 'local' &&
      typeof window !== 'undefined' &&
      window?.localStorage
    ) {
      this.storage = window.localStorage
      this.storageType = 'local'
    } else if (
      arg === 'session' &&
      typeof window !== 'undefined' &&
      window?.sessionStorage
    ) {
      this.storage = window.sessionStorage
      this.storageType = 'session'
    } else {
      this.storage = MemoryStorage.inject()
      this.storageType = 'memory'
    }
  }

  getItem<R = any>(key: string, defaultValue?: R): R | null {
    const rawValue = this.storage.getItem(storagePrefix + key)
    if (rawValue == null) {
      return defaultValue ?? null
    }
    try {
      return JSON.parse(rawValue)
    } catch (e) {
      return null
    }
  }

  setItem(key: string, value: any): void {
    this.storage.setItem(storagePrefix + key, JSON.stringify(value))
  }

  removeItem(key: string): void {
    this.storage.removeItem(storagePrefix + key)
  }
}

/**
 * Store data in memory cache.
 */
export class Store {
  private readonly expire: number
  private readonly cache: StorageImpl
  private readonly prefix: string

  /**
   * Create a memory cache.
   *
   * @param expire expire time in seconds for each record, Infinity value will never expire. default (60 * 60 * 1000)s.
   */
  constructor(expire: number, storage: Storage, prefix?: string)
  constructor(
    expire: number,
    storageType: 'local' | 'session' | 'memory',
    prefix?: string
  )
  constructor(
    expire: number,
    arg: Storage & ('local' | 'session' | 'memory'),
    prefix?: string
  ) {
    this.expire = expire || 60 * 60 * 1000
    this.cache = new StorageImpl(arg)
    this.prefix = prefix || ''
  }

  /**
   * Returns cached record data with id.
   * Returns null if the record is expired.
   *
   * @param id unique id.
   * @return {*} cache data.
   */
  get<R = any>(id: string): R | null {
    if (id !== undefined || id != null) {
      id = MD5(id.toString())
      const record = this.cache.getItem(this.prefix + id)
      if (record) {
        // delete record when it is expired
        if (Date.now() - record.created > this.expire) {
          this.cache.removeItem(this.prefix + id)
          return null
        }
        return record.data
      }
      return null
    }
    return null
  }

  /**
   * Save a record data to memory.
   * Saving different record with same id will always overwrite the old record.
   *
   * @param id unique id.
   * @param data cache record data.
   */
  save(id: string, data: any) {
    if (id !== undefined || id != null) {
      id = MD5(id.toString())
      this.cache.setItem(this.prefix + id, {
        id: id,
        data: data,
        created: Date.now(),
      })
    }
  }

  get storageType() {
    return this.cache.storageType
  }
}
