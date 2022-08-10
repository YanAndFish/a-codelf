# a-codelf
codelf api.

# Index

这个包是从[codeif](https://github.com/unbug/codelf)中抽取的一些函数，用于便捷地集成于各种web应用并发起查询

# Usage

``` typescript
import { ACodelfClient } from '@yafh/a-codelf'

const client = new ACodelfClient({})

client.requestVariable('basketball')
.then(console.log)
.catch(console.error)

```