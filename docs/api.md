## 四、腾讯财经API接口文档

### 1. 实时行情接口

- **接口地址**  
  `https://qt.gtimg.cn/q=sh600000,hk00700`
- **请求参数**
  - `q`：股票代码，多个用英文逗号分隔（如`sh600000`、`sz000001`、`hk00700`等）

#### 返回数据示例
```
v_sh600000="1~浦发银行~600000~10.12~10.10~10.13~123456~123456~123456~10.12~10.13~10.11~10.10~10.12~10.11~10.13~10.10~10.12~10.11~10.13~10.10~2024/07/20~15:00:00~00~";
```

#### 返回数据处理
- 以`~`分隔，按顺序映射字段，建议只取关心的字段，封装为对象。

#### 字段定义

| 索引 | 字段名     | 说明         | 示例值     |
|------|------------|--------------|------------|
| 1    | name       | 股票名称     | 浦发银行   |
| 2    | code       | 股票代码     | 600000     |
| 3    | now        | 当前价格     | 10.12      |
| 4    | close      | 昨收         | 10.10      |
| 5    | open       | 今开         | 10.13      |
| 6    | volume     | 成交量(手)   | 123456     |
| 7    | amount     | 成交额(元)   | 123456     |
| 31   | updown     | 涨跌额       | 0.02       |
| 32   | percent    | 涨跌幅(%)    | 0.20       |
| 30   | pe         | 市盈率       | 8.5        |
| 44   | total_mv   | 总市值       | 1000000000 |
| 45   | flow_mv    | 流通市值     | 800000000  |
| 46   | turnover   | 换手率(%)    | 1.23       |
| 47   | amplitude  | 振幅(%)      | 2.34       |
| 48   | high       | 最高         | 10.15      |
| 49   | low        | 最低         | 10.05      |
| 50   | high52     | 52周最高     | 12.00      |
| 51   | low52      | 52周最低     | 8.00       |
| 33   | time       | 时间         | 15:00:00   |

#### 处理示例
```js
function parseTencentQuote(str) {
  const arr = str.split('~');
  return {
    name: arr[1],
    code: arr[2],
    now: parseFloat(arr[3]),
    close: parseFloat(arr[4]),
    open: parseFloat(arr[5]),
    volume: parseInt(arr[6]),
    amount: parseFloat(arr[7]),
    updown: parseFloat(arr[31]),
    percent: parseFloat(arr[32]),
    pe: parseFloat(arr[30]),
    total_mv: parseFloat(arr[44]),
    flow_mv: parseFloat(arr[45]),
    turnover: parseFloat(arr[46]),
    amplitude: parseFloat(arr[47]),
    high: parseFloat(arr[48]),
    low: parseFloat(arr[49]),
    high52: parseFloat(arr[50]),
    low52: parseFloat(arr[51]),
    time: arr[33],
  };
}
```

---

### 2. K线数据接口

- **接口地址**  
  `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600000,day,,,320`
- **请求参数**
  - `param`：格式为`股票代码,周期类型,,,条数`，如`sh600000,day,,,320`
    - 周期类型：`day`日K、`week`周K、`month`月K、`minute`分时

#### 返回数据示例
```json
{
  "data": {
    "sh600000": {
      "day": [
        ["2024-07-19","10.10","10.20","10.05","10.12","123456","123456"],
        ["2024-07-18","10.00","10.10","9.90","10.05","100000","100000"]
      ]
    }
  }
}
```

#### 返回数据处理
- 取`data.股票代码.day`数组，遍历转为对象数组。

#### 字段定义

| 索引 | 字段名   | 说明     | 示例值      |
|------|----------|----------|-------------|
| 0    | date     | 日期     | 2024-07-19  |
| 1    | open     | 开盘价   | 10.10       |
| 2    | close    | 收盘价   | 10.20       |
| 3    | low      | 最低价   | 10.05       |
| 4    | high     | 最高价   | 10.12       |
| 5    | volume   | 成交量   | 123456      |
| 6    | amount   | 成交额   | 123456      |

#### 处理示例
```js
function parseKlineArr(arr) {
  return arr.map(item => ({
    date: item[0],
    open: parseFloat(item[1]),
    close: parseFloat(item[2]),
    low: parseFloat(item[3]),
    high: parseFloat(item[4]),
    volume: parseInt(item[5]),
    amount: parseFloat(item[6]),
  }));
}
```

---

### 3. 股票搜索接口

- **接口地址**  
  `https://smartbox.gtimg.cn/s3/?t=all&q=关键词`
- **请求参数**
  - `q`：搜索关键词（股票代码或名称）

#### 返回数据示例
```
v_hint="...~00700~腾讯控股~hk00700~...~600000~浦发银行~sh600000~..."
```
解析后对象数组示例：
```json
[
  { "code": "00700", "name": "腾讯控股", "fullcode": "hk00700" },
  { "code": "600000", "name": "浦发银行", "fullcode": "sh600000" }
]
```

#### 返回数据处理
- 以`~`分隔，依次为股票代码、名称、带前缀代码，正则提取A股/港股。

#### 字段定义

| 字段名   | 说明         | 示例值      |
|----------|--------------|------------|
| code     | 股票代码     | 600000     |
| name     | 股票名称     | 浦发银行   |
| fullcode | 带前缀代码   | sh600000   |

#### 处理示例
```js
function parseSearchResult(str) {
  const reg = /~(\d{5,6})~([^~]+)~([a-z]{2}\d{5,6})~/g;
  let match, arr = [];
  while ((match = reg.exec(str))) {
    arr.push({ code: match[1], name: match[2], fullcode: match[3] });
  }
  return arr;
}
```

---

### 4. 个股详细信息接口

- **接口地址**  
  `https://stock.gtimg.cn/data/index.php?appn=detail&action=info&c=sh600000`
- **请求参数**
  - `c`：股票代码（如`sh600000`）

#### 返回数据示例
```json
{
  "code": "sh600000",
  "name": "浦发银行",
  "list": [
    { "key": "公司简介", "value": "浦发银行是一家..." },
    { "key": "主营业务", "value": "银行业务" }
  ]
}
```

#### 返回数据处理
- 直接取`name`、`code`，`list`为键值对数组，可转为对象。

#### 字段定义

| 字段名 | 说明         | 示例值         |
|--------|--------------|---------------|
| code   | 股票代码     | sh600000      |
| name   | 股票名称     | 浦发银行      |
| list   | 详细信息数组 | [{key,value}] |

list内对象：

| 字段名 | 说明     | 示例值         |
|--------|----------|---------------|
| key    | 信息项名 | 公司简介      |
| value  | 信息内容 | 浦发银行是一家... |

#### 处理示例
```js
function parseDetailInfo(obj) {
  const info = {};
  obj.list.forEach(item => {
    info[item.key] = item.value;
  });
  return {
    code: obj.code,
    name: obj.name,
    info
  };
}
```