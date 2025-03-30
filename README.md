# Cards-Go

一个基于 AI 的知识卡片生成工具，支持多种风格和自定义选项。

## 功能特点

- **多 AI 提供商支持**：支持 ARK AI 和 Tuzi AI，可以灵活切换
- **多种卡片风格**：支持多种设计风格，包括极简主义、复古风、赛博朋克等
- **自定义选项**：可调整卡片比例、每行卡片数量等参数
- **查看源代码和提示词**：可以查看生成的卡片 HTML 源代码和使用的提示词
- **下载和分享**：支持将生成的卡片下载为图片
- **响应式设计**：适配各种屏幕尺寸的设备
- **PWA 支持**：可以安装到设备上作为独立应用使用

## 技术栈

- **前端**：原生 JavaScript、HTML、CSS、Tailwind CSS
- **后端**：Node.js、Express.js
- **API**：ARK AI API、Tuzi AI API
- **依赖**：axios、express-session、dotenv 等

## 安装和运行

### 前提条件

- Node.js (v14.0.0 或更高版本)
- npm 或 yarn
- ARK AI 和/或 Tuzi AI 的 API 密钥

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/yourusername/cards-go.git
   cd cards-go
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 创建 `.env` 文件并添加以下环境变量
   ```
   PORT=3001
   ARK_API_KEY=your_ark_api_key
   TUZI_API_KEY=your_tuzi_api_key
   ```

4. 启动服务器
   ```bash
   node server.js
   ```

5. 访问应用
   在浏览器中打开 `http://localhost:3001`

## 使用指南

1. **生成卡片**：
   - 在首页输入主题
   - 选择 AI 提供商（ARK 或 Tuzi）
   - 选择卡片风格和其他选项
   - 点击生成卡片按钮

2. **查看源代码和提示词**：
   - 生成卡片后，点击右上角的代码图标查看源代码
   - 点击魔法棒图标查看提示词

3. **下载卡片**：
   - 生成卡片后，点击下载按钮将卡片保存为图片

## 自定义选项说明

- **卡片比例**：支持 16:9、4:3、1:1、9:16、3:4、2:1 等多种比例
- **每行卡片数**：可选 1-4 张卡片每行
- **生成模式**：
  - 提取模式：从输入主题中提取知识点
  - 字面模式：直接使用输入内容生成卡片
  - 创造模式：基于输入主题创造新内容

## 项目结构

```
/
|-- public/            # 静态资源
|   |-- css/          # 样式文件
|   |-- js/           # 前端 JavaScript 文件
|   |-- index.html    # 首页
|   |-- manifest.json # PWA 配置文件
|
|-- routes/            # 路由处理
|   |-- api.js        # API 路由
|
|-- services/          # 服务层
|   |-- aiService.js  # AI 服务封装
|
|-- prompts/           # 提示词模板
|   |-- card.js       # 卡片生成提示词
|
|-- server.js          # 服务器入口文件
|-- package.json       # 项目依赖
|-- .env               # 环境变量文件
|-- README.md          # 项目说明
```

## 更新日志

### 2025-03-30

- 将默认 AI 提供商从 Tuzi 改为 ARK
- 将首页 logo 改为纯文本形式
- 修复卡片生成 HTML 内容显示问题
- 添加查看源代码和提示词的图标
- 添加 PWA 支持，包括 manifest.json 和图标

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或联系项目维护者。
