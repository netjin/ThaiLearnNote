# LearnThaiNote

本地泰语学习卡片应用，初始数据来自 Notion 页面 `7.1 学习笔记`，也支持上传多张照片自动生成课程学习总结。

## 本地使用

先安装依赖：

```bash
npm install
```

复制环境变量文件并填入 OpenAI API key：

```bash
cp .env.example .env
```

启动服务：

```bash
npm start
```

然后访问 `http://localhost:5173`。

## Docker 使用

先准备环境变量：

```bash
cp .env.example .env
```

在 `.env` 中填入 `OPENAI_API_KEY`。然后用 Docker Compose 启动：

```bash
docker compose up --build
```

或者不用 Compose：

```bash
docker build -t learn-thai-note .
docker run --rm -p 5173:5173 --env-file .env learn-thai-note
```

启动后访问 `http://localhost:5173`。

页面包含：

- 地点词汇卡片和表格视图
- 中文 / English / 泰语 / RTGS 搜索
- 遮住释义的复习模式
- 浏览器 Web Speech API 泰语朗读
- 语法说明、易混淆词和实用例句区块
- 上传同一课程的多张照片后，自动合并生成词汇、语法说明、易混淆词和例句
- 将生成结果保存为首页当前复习课程

## 数据保存

生成出的课程总结会保存到 SQLite：

- 本地运行：默认写入 `data/learn-thai-note.sqlite`
- Docker Compose：默认挂载到 named volume `thai-learn-note-data`

课程里的词汇、例句、语法说明和易混淆点以 JSON 形式保存在数据库记录中。上传的原始图片不保存，只在生成时临时读取。

如果手动 `docker run`，建议挂载数据目录：

```bash
docker run --rm \
  -p 5173:5173 \
  --env-file .env \
  -v thai-learn-note-data:/app/data \
  learn-thai-note
```

## 配置

- `OPENAI_API_KEY`：服务端调用 OpenAI API 使用，不会暴露到浏览器。
- `OPENAI_MODEL`：默认 `gpt-4o-mini`，可以换成你账号可用的视觉模型。
- `PORT`：默认 `5173`。
- `DATA_DIR`：SQLite 数据目录，默认本地 `./data`，Docker 中为 `/app/data`。
