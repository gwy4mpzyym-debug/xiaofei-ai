# 小老板 AI 自动化系统

这是一个不依赖 npm 安装包的多商家 MVP：Node.js 自带 HTTP 服务 + 原生前端。
它不是只给小飞理发店用，而是一套可以复制卖给不同老板的 AI 接待自动化模板。

## 页面

- 平台首页：http://127.0.0.1:8756/
- 小飞顾客咨询页：http://127.0.0.1:8756/chat?business=xiaofei
- 小飞老板后台：http://127.0.0.1:8756/admin?business=xiaofei
- 美容店样板页：http://127.0.0.1:8756/chat?business=beauty
- 健康检查：http://127.0.0.1:8756/api/health

平台新增老板密码：`admin123`
小飞后台默认密码：`288133`
美容店样板后台默认密码：`123456`

## 启动

```bash
cd /Users/fuhongjun/Documents/Codex/2026-06-09/new-chat-3/outputs/xiaofei-ai
node server.js
```

打开：

```text
http://127.0.0.1:8756
```

## 接入真实 OpenAI

```bash
export OPENAI_API_KEY="你的_api_key"
export OPENAI_MODEL="gpt-4.1-mini"
node server.js
```

没有 `OPENAI_API_KEY` 时，系统会自动进入演示模式。

## 当前功能

- 平台页可以直接新增老板客户，不需要改代码。
- 平台页展示首次 7 天免费试用，以及 1 个月、3 个月、12 个月订阅套餐。
- 老板付款后，平台管理员可以给商家开通或续费订阅。
- 每个商家只能使用一次 7 天免费试用；用过试用或开通过付费订阅后不能再次试用。
- 未开通或已到期的商家，顾客页会停用 AI 咨询，后端也会拦截聊天接口。
- 每个商家有自己的店名、行业、服务、价格、地址、电话、营业时间和快捷问题。
- 顾客可以询问价格、地址、营业时间和预约。
- AI 会自动回复，并提取服务项目、预约时间、手机号、意向分和下一步动作。
- 每个商家的老板后台独立登录。
- 老板可以查看线索统计、修改线索状态、写备注、删除线索、导出 CSV。
- 每个商家的线索单独保存，例如 `data/xiaofei-leads.json`。
- 商家配置保存在 `data/businesses.json`。

## 新增一个老板

打开平台页，输入平台密码 `admin123` 解锁新增表单。

填写：

- 商家 ID：链接参数，比如 `nail`
- 店名和行业
- 老板后台密码
- 电话、地址、营业时间
- 服务项目：每行一个，格式是 `服务名 | 价格 | 时长 | 关键词`
- 转人工规则：每行一个规则

新增后老板的链接就是：

```text
顾客页：http://127.0.0.1:8756/chat?business=商家id
后台：http://127.0.0.1:8756/admin?business=商家id
```

## 开通订阅

当前版本是“人工收款 + 平台手动开通”的模式。

套餐默认是：

- 首次 7 天免费试用：0 元，每个商家仅一次
- 1 个月：199 元
- 3 个月：499 元
- 12 个月：1599 元

首次试用：

1. 打开平台首页 `http://127.0.0.1:8756/`
2. 输入平台密码解锁
3. 找到对应商家
4. 点击 `7天免费试用`

同一个商家用过试用后，系统会记录在 `data/businesses.json` 里。即使试用到期或被停用，也不能再次开通免费试用。

老板付款后：

1. 打开平台首页 `http://127.0.0.1:8756/`
2. 输入平台密码解锁
3. 找到对应商家
4. 点击 `1个月`、`3个月` 或 `12个月`

系统会自动计算到期时间。如果商家当前还没到期，续费会从当前到期日继续往后加；如果已经过期，会从今天重新计算。

真实支付接口以后可以接微信、支付宝或 Stripe。支付成功回调只需要调用同一套订阅开通逻辑。

## 上线前要改

```bash
export HOST="0.0.0.0"
export PORT="8756"
export DATA_DIR="./data"
export PLATFORM_PASSWORD="换成你的平台管理密码"
export SESSION_SECRET="换成一串随机长字符"
export OPENAI_API_KEY="你的 OpenAI API key"
export OPENAI_MODEL="gpt-4.1-mini"
```

本地演示模式不需要 OpenAI key。正式卖给老板时建议接入真实 `OPENAI_API_KEY`。

## 部署

这个项目没有 npm 依赖，部署时运行：

```bash
node server.js
```

如果平台识别 `package.json`，它会使用：

```bash
npm start
```

上线后把平台首页发给自己使用；给老板发 `/admin?business=商家id`，给顾客二维码使用 `/chat?business=商家id`。
