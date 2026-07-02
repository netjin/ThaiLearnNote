# LearnThaiNote

泰语课程学习卡片应用。它可以把同一课程的教材照片、例句页、手写笔记或 Notion 截图合并成一份课程总结，并保存到本地 SQLite 数据库，后续部署或重启后仍可继续复习。

## 功能

- 按课程/单元组织学习内容，不按日期拆分。
- 支持一次上传多张图片，优先从图片标题识别课程主题。
- 自动生成并保存：
  - 核心词汇：中文、英文、泰语、RTGS 发音
  - 实用例句
  - 语法/用法说明
  - 易混淆点
- 首页提供卡片和表格两种复习视图。
- 支持搜索、遮住释义、卡片翻面。
- 发音使用浏览器 Web Speech API，本身不消耗 OpenAI API 费用。
- Docker Compose 默认挂载数据卷，课程记录不会因容器重建丢失。

## 页面

- `http://localhost:5173/`：学习卡片首页，显示当前课程。
- `http://localhost:5173/admin.html`：后台管理，上传课程资料、编辑已保存课程。
- `http://localhost:5173/generate.html`：旧上传入口，会自动跳转到后台管理。

## 本地运行

安装依赖：

```bash
npm install
```

复制环境变量文件：

```bash
cp .env.example .env
```

在 `.env` 中填入：

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=5173
```

启动：

```bash
npm start
```

访问：

```text
http://localhost:5173
```

## Docker 运行

推荐使用 Docker Compose：

```bash
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY
docker compose up --build
```

手动 Docker 运行：

```bash
docker build -t learn-thai-note .
docker run --rm \
  -p 5173:5173 \
  --env-file .env \
  -v thai-learn-note-data:/app/data \
  learn-thai-note
```

## 更新部署

服务器上首次克隆后，准备 `.env`：

```bash
git clone https://github.com/netjin/ThaiLearnNote.git
cd ThaiLearnNote
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY
```

之后每次更新代码并重启 Docker：

```bash
./scripts/deploy.sh
```

脚本会执行：

- 拉取当前 Git 分支最新代码
- 校验 Docker Compose 配置
- `docker compose up -d --build --remove-orphans`
- 清理 dangling Docker 镜像
- 保留 `thai-learn-note-data` 数据卷，不会删除课程数据库

如果已经手动拉取代码，只想重建容器：

```bash
SKIP_GIT_PULL=1 ./scripts/deploy.sh
```

## 数据保存

课程总结保存到 SQLite：

- 本地运行：`data/learn-thai-note.sqlite`
- Docker Compose：named volume `thai-learn-note-data` 挂载到 `/app/data`

数据库保存的是结构化课程总结，包括词汇、例句、语法说明和易混淆点。上传的原始图片不会保存，只在生成时临时读取。

## API

- `GET /healthz`：健康检查。
- `GET /api/courses`：列出所有已保存课程。
- `GET /api/courses/latest`：读取最新课程。
- `GET /api/courses/:id`：读取指定课程。
- `POST /api/courses`：保存课程 JSON。
- `PUT /api/courses/:id`：更新指定课程 JSON。
- `POST /api/generate-note`：上传图片，生成课程总结并自动保存。

`POST /api/generate-note` 使用 multipart form：

- `images`：一张或多张图片，最多 8 张。
- `course`：可选。照片里有标题时可以留空，仅在需要修正课程名时填写。

后台编辑页会把词汇、例句、语法说明和易混淆点显示为 JSON 数组。保存时会校验这些字段必须是数组。

## 配置

- `OPENAI_API_KEY`：后端调用 OpenAI API 使用，不会暴露给浏览器。
- `OPENAI_MODEL`：默认 `gpt-4o-mini`，可换成账号可用的视觉模型。
- `PORT`：服务端口，默认 `5173`。
- `DATA_DIR`：SQLite 数据目录，本地默认 `./data`，Docker 中默认 `/app/data`。

## 费用说明

- 上传图片生成总结会调用 OpenAI API，会产生 API 费用。
- 点击播放发音不调用 OpenAI API，使用浏览器本机 Web Speech API。

## 开发检查

```bash
node --check server.js
node --check db.js
node --check app.js
node --check admin.js
npm audit --audit-level=moderate
docker compose config
```
