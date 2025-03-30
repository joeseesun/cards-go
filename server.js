// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import apiRoutes from './routes/api.js';

// 配置环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 添加会话支持
app.use(session({
  secret: 'cards-go-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1小时过期
}));

// API路由
app.use('/api', apiRoutes);

// 前端路由 - 返回主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 卡片展示页面
app.get('/card', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'card.html'));
});

// 加载页面路由
app.get('/loading', (req, res) => {
  // 直接返回一个简单的加载页面，实际内容会由前端 JavaScript 处理
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>正在加载...</title>
  <script src="/js/script.js" defer></script>
</head>
<body>
  <div id="loading-container" style="display: flex; justify-content: center; align-items: center; height: 100vh;">
    <p>正在加载，请稍候...</p>
  </div>
</body>
</html>
  `);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
