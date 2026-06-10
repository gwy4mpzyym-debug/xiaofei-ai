# 部署说明

## 本地启动

```bash
node server.js
```

打开：

```text
http://127.0.0.1:8756/
```

## 云端环境变量

上线前至少设置：

```bash
HOST=0.0.0.0
PORT=平台自动提供或 8756
DATA_DIR=持久化数据目录，例如 /var/data
PLATFORM_PASSWORD=你的平台管理密码
SESSION_SECRET=一串随机长字符
OPENAI_API_KEY=你的 OpenAI API key
OPENAI_MODEL=gpt-4.1-mini
```

没有 `OPENAI_API_KEY` 时会进入演示模式。

## 启动命令

```bash
npm start
```

或：

```bash
node server.js
```

## 健康检查

```text
/api/health
```

## 重要提醒

当前数据保存在本地 JSON 文件：

- `data/businesses.json`
- `data/<business-id>-leads.json`

部署到会重置文件系统的平台时，需要配置持久磁盘并把 `DATA_DIR` 指到持久目录，或换成云数据库。适合下一步接入 SQLite/Postgres/Supabase。

订阅现在是人工收款后在平台后台手动开通。以后接微信、支付宝或 Stripe 时，把支付成功回调接到商家的订阅开通逻辑即可。
