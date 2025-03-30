// API路由模块
import express from 'express';
import { getAIResponse } from '../services/aiService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 获取设计风格列表
router.get('/design-styles', async (req, res) => {
  try {
    // 从卡片生成器模块导入设计风格列表
    const { DESIGN_STYLES } = await import('../prompts/card.js');
    res.json(DESIGN_STYLES);
  } catch (error) {
    console.error('获取设计风格列表时出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 处理生成卡片HTML请求 - 与前端代码匹配
router.get('/generate-cards-html', async (req, res) => {
  try {
    console.log('收到生成卡片HTML请求:', req.query);
    
    // 从查询参数中提取主题和配置
    const { theme, ...configParams } = req.query;
    
    if (!theme) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>生成失败</title>
          <style>
            body {
              font-family: 'Noto Sans SC', sans-serif;
              background-color: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            .error-container {
              max-width: 500px;
              padding: 30px;
              background-color: white;
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #e74c3c;
              margin-bottom: 20px;
            }
            p {
              color: #666;
              margin-bottom: 30px;
              line-height: 1.6;
            }
            a {
              display: inline-block;
              padding: 10px 20px;
              background-color: #3498db;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              text-decoration: none;
              font-size: 16px;
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="error-container">
            <h1>生成失败</h1>
            <p>内容是必需的，请输入内容后重试。</p>
            <a href="/">返回首页</a>
          </div>
        </body>
        </html>
      `);
    }
    
    // 处理配置参数
    const config = {};
    
    // 处理数字类型参数
    ['quoteCount', 'cardsPerRow', 'maxQuoteLength'].forEach(param => {
      if (configParams[param] !== undefined) {
        const value = parseInt(configParams[param]);
        if (!isNaN(value)) {
          config[param] = value;
        }
      }
    });
    
    // 特殊处理contextLength，确保0值能被正确处理
    if (configParams.contextLength !== undefined) {
      // 如果是字符串'0'或数字0，直接设置为0
      if (configParams.contextLength === '0' || configParams.contextLength === 0) {
        config.contextLength = 0;
      } else {
        const value = parseInt(configParams.contextLength);
        if (!isNaN(value)) {
          config.contextLength = value;
        }
      }
    }
    
    // 处理字符串类型参数
    if (configParams.aspectRatio) {
      config.aspectRatio = configParams.aspectRatio;
    }
    
    // 处理风格选择参数
    if (configParams.styleSelection) {
      // 如果是字符串（逗号分隔的代码），转换为数组
      if (typeof configParams.styleSelection === 'string') {
        config.styleSelection = configParams.styleSelection.split(',');
      } else if (Array.isArray(configParams.styleSelection)) {
        config.styleSelection = configParams.styleSelection;
      }
    }
    
    // 处理内容处理模式
    if (configParams.mode) {
      config.mode = configParams.mode;
    }
    
    // 处理高度设置
    if (configParams.maxHeight) {
      config.maxHeight = parseInt(configParams.maxHeight);
    }
    
    if (configParams.minHeight) {
      config.minHeight = parseInt(configParams.minHeight);
    }
    
    console.log('使用配置生成卡片HTML:', config);
    
    // 从卡片生成器获取提示词
    const { getCardGeneratorPrompt } = await import('../prompts/card.js');
    const systemPrompt = getCardGeneratorPrompt(config);
    
    // 构建提示词 - 现在将用户输入视为内容而不是主题词
    const userPrompt = `以下是需要提取金句并创建知识卡片的内容：

${theme}`;
    
    // 根据模式调整系统提示词
    let fullSystemPrompt = systemPrompt;
    if (config.mode === 'literal') {
      // 字面模式：不进行提取或改写，完全基于原文内容
      fullSystemPrompt = systemPrompt.replace(
        "你的任务是从用户提供的内容中提取关键金句",
        "你的任务是完全基于用户提供的原文内容制作知识卡片，不要进行提取或改写"
      );
    }
    
    // 存储提示词到会话，以便后续查看
    req.session.systemPrompt = systemPrompt;
    req.session.fullSystemPrompt = fullSystemPrompt;
    req.session.userPrompt = userPrompt;
    
    // 获取AI提供商和模型参数
    const provider = configParams.provider;
    const model = configParams.model;
    console.log('====== 前端选择的AI提供商和模型 ======');
    console.log('提供商:', provider);
    console.log('模型ID:', model);
    console.log('请求来源IP:', req.ip);
    console.log('请求参数:', JSON.stringify(req.query));
    console.log('=======================================');
    
    // 调用AI服务
    console.log('开始调用AI服务生成卡片HTML...');
    const { getAIResponse } = await import('../services/aiService.js');
    
    // 明确指定要使用的 AI 提供商和模型
    const aiOptions = { provider, model };
    console.log('GET 请求传递给 getAIResponse 的选项:', JSON.stringify(aiOptions));
    
    // 调用 AI 服务，并传递 AI 提供商和模型参数
    const response = await getAIResponse(userPrompt, fullSystemPrompt, aiOptions);
    console.log('AI服务响应成功，响应长度:', response.length);
    
    // 尝试提取HTML
    console.log('尝试从响应中提取HTML...');
    let html = '';
    
    // 尝试从代码块中提取HTML
    const htmlCodeBlockRegex = /```html([\s\S]*?)```/;
    const match = response.match(htmlCodeBlockRegex);
    
    if (match && match[1]) {
      html = match[1].trim();
      console.log('提取到HTML代码块，长度:', html.length);
    } else {
      // 如果没有代码块，检查是否直接返回HTML
      if (response.includes('<html') || response.includes('<body') || response.includes('<div')) {
        html = response;
        console.log('原始响应包含HTML标签，使用原始响应');
      } else {
        // 如果不是HTML，则将其包裹在错误消息中
        console.error('无法从响应中提取HTML');
        return res.status(500).send(`
          <!DOCTYPE html>
          <html lang="zh-CN">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>生成失败</title>
            <style>
              body {
                font-family: 'Noto Sans SC', sans-serif;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                padding: 20px;
                text-align: center;
              }
              .error-container {
                max-width: 500px;
                padding: 30px;
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              }
              h1 {
                color: #e74c3c;
                margin-bottom: 20px;
              }
              p {
                color: #666;
                margin-bottom: 30px;
                line-height: 1.6;
              }
              a {
                display: inline-block;
                padding: 10px 20px;
                background-color: #3498db;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                text-decoration: none;
                font-size: 16px;
              }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
          </head>
          <body>
            <div class="error-container">
              <h1>生成失败</h1>
              <p>生成卡片时出现错误，请重试。</p>
              <a href="/">返回首页</a>
            </div>
          </body>
          </html>
        `);
      }
    }
    
    // 构建完整的HTML响应
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>知识卡片</title>
        <link rel="stylesheet" href="/css/card-styles.css">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;700&family=ZCOOL+XiaoWei&family=Ma+Shan+Zheng&family=Playfair+Display:wght@400;700&family=Space+Mono&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">
        <style>
          body {
            font-family: 'Noto Sans SC', sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
            margin: 0;
            position: relative;
          }
          .card-container {
            display: grid;
            grid-template-columns: repeat(${config.cardsPerRow || 2}, 1fr);
            gap: 20px;
            margin: 0 auto;
            max-width: 1200px;
          }
          @media (max-width: 768px) {
            .card-container {
              grid-template-columns: 1fr;
            }
          }
          .aspect-16-9 {
            aspect-ratio: 16/9;
          }
          .aspect-4-3 {
            aspect-ratio: 4/3;
          }
          .aspect-1-1 {
            aspect-ratio: 1/1;
          }
          .aspect-9-16 {
            aspect-ratio: 9/16;
          }
          .aspect-3-4 {
            aspect-ratio: 3/4;
          }
          .aspect-2-1 {
            aspect-ratio: 2/1;
          }
          ${config.maxHeight ? `.card { max-height: ${config.maxHeight}px; }` : ''}
          ${config.minHeight ? `.card { min-height: ${config.minHeight}px; }` : ''}
          
          /* 工具图标样式 */
          .tools-container {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 15px;
            z-index: 1000;
          }
          .tool-icon {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background-color: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            text-decoration: none;
          }
          .tool-icon:hover {
            background-color: #e8f5e9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .tool-icon i {
            font-size: 20px;
            color: #1a8917;
          }
        </style>
      </head>
      <body>
        <!-- 工具图标 -->
        <div class="tools-container">
          <a href="/api/view-source" target="_blank" class="tool-icon" title="查看源代码">
            <i class="fas fa-code"></i>
          </a>
          <a href="/api/view-prompt" target="_blank" class="tool-icon" title="查看提示词">
            <i class="fas fa-magic"></i>
          </a>
        </div>
        
        ${html}
        <script src="/js/card.js"></script>
      </body>
      </html>
    `;
    
    // 存储卡片数据到会话中，以便加载页面可以检测到生成完成
    req.session.cardData = {
      html: fullHtml,
      timestamp: new Date().toISOString()
    };
    
    // 存储原始HTML代码和原始响应到会话中，以便查看源代码
    req.session.originalHtml = html;
    req.session.originalResponse = response;
    
    console.log('生成完成，返回HTML内容，长度:', fullHtml.length);
    res.send(fullHtml);
  } catch (error) {
    console.error('生成卡片HTML时出错:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>生成失败</title>
        <style>
          body {
            font-family: 'Noto Sans SC', sans-serif;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          .error-container {
            max-width: 500px;
            padding: 30px;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #e74c3c;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
          }
          a {
            display: inline-block;
            padding: 10px 20px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            font-size: 16px;
          }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
      </head>
      <body>
        <div class="error-container">
          <h1>生成失败</h1>
          <p>生成卡片时出现错误，请重试。错误信息: ${error.message}</p>
          <a href="/">返回首页</a>
        </div>
      </body>
      </html>
    `);
  }
});

// 处理卡片生成请求
router.post('/generate-card', async (req, res) => {
  try {
    const { theme, ...configParams } = req.body;
    
    if (!theme) {
      return res.status(400).json({ error: '内容是必需的' });
    }
    
    // 处理配置参数
    const config = {};
    
    // 处理数字类型参数
    ['quoteCount', 'cardsPerRow', 'maxQuoteLength'].forEach(param => {
      if (configParams[param] !== undefined) {
        const value = parseInt(configParams[param]);
        if (!isNaN(value)) {
          config[param] = value;
        }
      }
    });
    
    // 特殊处理contextLength，确保0值能被正确处理
    if (configParams.contextLength !== undefined) {
      // 如果是字符串'0'或数字0，直接设置为0
      if (configParams.contextLength === '0' || configParams.contextLength === 0) {
        config.contextLength = 0;
      } else {
        const value = parseInt(configParams.contextLength);
        if (!isNaN(value)) {
          config.contextLength = value;
        }
      }
    }
    
    // 处理字符串类型参数
    if (configParams.aspectRatio) {
      config.aspectRatio = configParams.aspectRatio;
    }
    
    // 处理风格选择参数
    if (configParams.styleSelection) {
      // 如果是字符串（逗号分隔的代码），转换为数组
      if (typeof configParams.styleSelection === 'string') {
        config.styleSelection = configParams.styleSelection.split(',');
      } else if (Array.isArray(configParams.styleSelection)) {
        config.styleSelection = configParams.styleSelection;
      }
    }
    
    // 处理内容处理模式
    if (configParams.mode) {
      config.mode = configParams.mode;
    }
    
    // 处理高度设置
    if (configParams.maxHeight) {
      config.maxHeight = parseInt(configParams.maxHeight);
    }
    
    if (configParams.minHeight) {
      config.minHeight = parseInt(configParams.minHeight);
    }
    
    console.log('使用配置生成卡片:', config);
    
    // 从卡片生成器获取提示词
    const { getCardGeneratorPrompt } = await import('../prompts/card.js');
    const systemPrompt = getCardGeneratorPrompt(config);
    
    // 构建提示词 - 现在将用户输入视为内容而不是主题词
    const userPrompt = `以下是需要提取金句并创建知识卡片的内容：

${theme}`;
    
    // 根据模式调整系统提示词
    let fullSystemPrompt = systemPrompt;
    if (config.mode === 'literal') {
      // 字面模式：不进行提取或改写，完全基于原文内容
      fullSystemPrompt = systemPrompt.replace(
        "你的任务是从用户提供的内容中提取关键金句",
        "你的任务是完全基于用户提供的原文内容制作知识卡片，不要进行提取或改写"
      );
    }
    
    // 存储提示词到会话，以便后续查看
    req.session.systemPrompt = systemPrompt;
    req.session.fullSystemPrompt = fullSystemPrompt;
    req.session.userPrompt = userPrompt;
    
    // 获取AI提供商和模型参数
    const provider = req.body.provider;
    const model = req.body.model;
    console.log('====== 前端选择的AI提供商和模型 ======');
    console.log('提供商:', provider);
    console.log('模型ID:', model);
    console.log('请求来源IP:', req.ip);
    console.log('请求参数:', JSON.stringify(req.body));
    console.log('=======================================');
    
    // 调用AI服务
    console.log('开始调用AI服务生成卡片...');
    let response;
    try {
      // 明确指定要使用的 AI 提供商和模型
      const aiOptions = { provider, model };
      console.log('传递给 getAIResponse 的选项:', JSON.stringify(aiOptions));
      
      // 调用 AI 服务，并传递 AI 提供商和模型参数
      response = await getAIResponse(userPrompt, fullSystemPrompt, aiOptions);
      console.log('AI服务响应成功，响应长度:', response.length);
    } catch (error) {
      console.error('AI服务调用失败:', error);
      return res.status(500).json({ error: '生成卡片时出错，请重试' });
    }
    
    // 尝试解析JSON响应
    let cards = [];
    let html = '';
    console.log('开始解析AI响应...');
    
    try {
      // 先尝试从响应中提取JSON
      console.log('尝试从响应中提取JSON...');
      const jsonMatch = response.match(/\{[\s\S]*?"cards"[\s\S]*?\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        console.log('找到JSON字符串:', jsonStr.substring(0, 100) + '...');
        try {
          const data = JSON.parse(jsonStr);
          if (data.cards && Array.isArray(data.cards)) {
            cards = data.cards;
            console.log('成功解析卡片JSON数据:', cards.length + '张卡片');
          } else {
            console.error('JSON中没有cards数组或cards不是数组');
          }
        } catch (parseError) {
          console.error('JSON解析错误:', parseError, '原始JSON字符串:', jsonStr);
          throw parseError;
        }
      } else {
        console.log('没有找到JSON格式的卡片数据');
      }
    } catch (jsonError) {
      console.error('解析JSON失败:', jsonError);
      
      // 如果无法解析JSON，尝试提取HTML
      console.log('尝试从响应中提取HTML...');
      const htmlCodeBlockRegex = /```html([\s\S]*?)```/;
      const match = response.match(htmlCodeBlockRegex);
      
      if (match && match[1]) {
        html = match[1].trim();
        console.log('提取到HTML代码块，长度:', html.length);
        // 存储原始响应到会话中，以便查看源代码
        req.session.originalResponse = response;
      } else {
        console.log('未找到HTML代码块，检查原始响应...');
        // 检查原始响应是否包含<div>或<html>标签
        if (response.includes('<div') || response.includes('<html')) {
          html = response;
          console.log('原始响应包含HTML标签，使用原始响应');
        } else {
          console.error('原始响应不包含HTML标签，无法生成卡片');
          html = `<div class="error-message">生成卡片时出错，请重试</div>`;
        }
      }
    }
    
    // 如果成功解析到卡片数据，生成新的HTML
    if (cards.length > 0) {
      console.log('开始生成卡片HTML...');
      try {
        // 获取设计风格映射
        const { DESIGN_STYLES } = await import('../prompts/card.js');
        const styleMap = {};
        DESIGN_STYLES.forEach(style => {
          styleMap[style.code] = style;
        });
        console.log('加载了', DESIGN_STYLES.length, '种设计风格');
        
        // 生成卡片HTML
        const cardsPerRow = config.cardsPerRow || 2;
        const aspectRatio = config.aspectRatio || '16:9';
        const aspectClass = 'aspect-' + aspectRatio.replace(':', '-');
        console.log('卡片设置: 每行', cardsPerRow, '张, 比例', aspectRatio);
      
        // 创建卡片容器
        html = `
        <div class="card-container cards-per-row-${cardsPerRow}">
          ${cards.map((card, index) => {
            // 确定卡片风格
            let styleCode = card.style || 'MINI';
            let styleClass = '';
            
            // 根据风格代码映射到CSS类
            switch(styleCode) {
              case 'VINT': styleClass = 'vintage'; break;
              case 'TECH': styleClass = 'futuristic'; break;
              case 'BOLD': styleClass = 'bold-modern'; break;
              case 'DECO': styleClass = 'art-deco'; break;
              case 'MINI': styleClass = 'minimalist'; break;
              case 'SCAN': styleClass = 'constructivism'; break;
              case 'PUNK': styleClass = 'cyberpunk'; break;
              case 'JPNM': styleClass = 'neo-futurism'; break;
              case 'BRIT': styleClass = 'british-rock'; break;
              default: styleClass = 'minimalist';
            }
            
            // 生成卡片HTML
            return `
            <div class="card ${styleClass} ${aspectClass}">
              ${getStyleSpecificElements(styleClass)}
              <div class="content">
                <div class="quote">${card.quote}</div>
                <div class="context">${card.context}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
        `;
      } catch (styleError) {
        console.error('生成卡片HTML时出错:', styleError);
        html = `<div class="error-message">生成卡片时出错，请重试</div>`;
      }
    }
    
    // 将卡片数据存储到会话中，以便加载页面可以检测到生成完成
    req.session.cardData = {
      html: html,
      cards: cards,
      timestamp: new Date().toISOString()
    };
    
    // 将原始HTML存储到会话中，以便查看源代码
    // 保存未添加工具图标的原始HTML
    req.session.originalHtml = html;
    // 同时保存原始响应，以便查看源代码
    req.session.originalResponse = response;
    
    // 返回HTML内容
    console.log('生成完成，返回HTML内容，长度:', html.length);
    
    // 如果HTML内容为空，则使用原始AI响应
    if (!html || html.trim() === '') {
      console.log('HTML内容为空，尝试使用原始AI响应');
      
      // 检查原始AI响应是否包含<html>标签
      if (response.includes('<html') || response.includes('<!DOCTYPE')) {
        html = response;
        console.log('使用原始AI响应作为HTML内容，长度:', html.length);
      }
      
      // 检查是否是 Markdown 代码块格式
      const htmlCodeBlockRegex = /^```html\s*([\s\S]*?)```\s*$/;
      const match = response.match(htmlCodeBlockRegex);
      if (match && match[1]) {
        html = match[1].trim();
        console.log('从 Markdown 代码块中提取 HTML 内容，长度:', html.length);
      }
    }
    
    // 处理可能的 Markdown 代码块格式
    if (html) {
      // 删除开头的 ```html 标记
      if (html.trim().startsWith('```html')) {
        html = html.replace(/^```html\s*/, '');
      }
      // 删除结尾的 ``` 标记
      if (html.trim().endsWith('```')) {
        html = html.replace(/```\s*$/, '');
      }
    }
    
    // 在生成的 HTML 内容中直接插入查看源码和提示词的图标
    // 首先检查 HTML 内容是否已经包含 <body> 标签
    if (html && html.includes('<body')) {
      // 如果已经包含 <body>，在 body 标签后插入工具图标
      const toolsHtml = `
        <!-- 工具图标 -->
        <style>
          /* 工具图标样式 */
          .tools-container {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 15px;
            z-index: 1000;
          }
          .tool-icon {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background-color: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            text-decoration: none;
          }
          .tool-icon:hover {
            background-color: #e8f5e9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .tool-icon i {
            font-size: 20px;
            color: #1a8917;
          }
        </style>
        <div class="tools-container">
          <a href="/api/view-source" target="_blank" class="tool-icon" title="查看源代码">
            <i class="fas fa-code"></i>
          </a>
          <a href="/api/view-prompt" target="_blank" class="tool-icon" title="查看提示词">
            <i class="fas fa-magic"></i>
          </a>
        </div>
      `;
      
      // 检查是否已经包含 Font Awesome
      if (!html.includes('font-awesome')) {
        // 如果没有 Font Awesome，在 head 标签中添加
        html = html.replace('<head>', '<head>\n<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">');
      }
      
      // 在 body 标签后插入工具图标
      html = html.replace('<body>', '<body>\n' + toolsHtml);
    } else {
      // 如果不包含 <body>，则在内容开头添加工具图标
      const toolsHtml = `
        <!-- 工具图标 -->
        <style>
          /* 工具图标样式 */
          .tools-container {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 15px;
            z-index: 1000;
          }
          .tool-icon {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background-color: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            text-decoration: none;
          }
          .tool-icon:hover {
            background-color: #e8f5e9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .tool-icon i {
            font-size: 20px;
            color: #1a8917;
          }
        </style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">
        <div class="tools-container">
          <a href="/api/view-source" target="_blank" class="tool-icon" title="查看源代码">
            <i class="fas fa-code"></i>
          </a>
          <a href="/api/view-prompt" target="_blank" class="tool-icon" title="查看提示词">
            <i class="fas fa-magic"></i>
          </a>
        </div>
      `;
      
      // 在内容开头添加工具图标
      html = toolsHtml + html;
    }
    
    res.json({ html: html });
    
    // 返回风格特定元素
    function getStyleSpecificElements(styleClass) {
      switch(styleClass) {
        case 'vintage': 
          return '<div class="decoration"></div>';
        case 'futuristic': 
          return '<div class="grid"></div>';
        case 'bold-modern': 
          return '<div class="shape"></div>';
        case 'art-deco': 
          return '<div class="pattern"></div>';
        case 'constructivism': 
          return '<div class="lines"></div>';
        case 'cyberpunk': 
          return '<div class="glitch"></div>';
        case 'neo-futurism': 
          return '<div class="circles"></div>';
        case 'british-rock': 
          return '<div class="union-jack"></div>';
        default: 
          return '';
      }
    }
    
  } catch (error) {
    console.error('生成卡片时出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 查看原始HTML代码
router.get('/view-source', (req, res) => {
  try {
    // 获取存储在会话中的原始 HTML 代码和原始响应
    const originalHtml = req.session.originalHtml;
    const originalResponse = req.session.originalResponse;
    
    if (!originalHtml && !originalResponse) {
      return res.status(404).send('未找到HTML代码，请先生成卡片');
    }
    
    // 处理原始响应中的代码块
    let displayHtml = originalHtml;
    
    // 如果原始HTML为空但有原始响应，尝试从响应中提取HTML代码块
    if ((!displayHtml || displayHtml.trim() === '') && originalResponse) {
      const htmlCodeBlockRegex = /```html([\s\S]*?)```/;
      const match = originalResponse.match(htmlCodeBlockRegex);
      
      if (match && match[1]) {
        displayHtml = match[1].trim();
        console.log('从原始响应中提取到HTML代码块');
      } else {
        // 如果没有找到HTML代码块，就使用原始响应
        displayHtml = originalResponse;
        console.log('使用原始响应作为显示内容');
      }
    }
    
    // 安全转义HTML字符
    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
    
    // 返回一个简单的页面，显示HTML代码
    res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>查看源代码</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">
  <style>
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
      white-space: pre-wrap;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .back-button {
      display: inline-block;
      padding: 8px 16px;
      background-color: #3498db;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    .copy-button {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      background-color: rgba(255, 255, 255, 0.8);
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .copy-button:hover {
      background-color: rgba(255, 255, 255, 1);
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .copy-button i {
      font-size: 14px;
    }
    .copy-success {
      background-color: #4CAF50 !important;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>知识卡片 HTML 源代码</h1>
    <a href="javascript:history.back()" class="back-button">返回卡片</a>
  </div>
  <div style="position: relative;">
    <textarea id="source-code" readonly style="width: 100%; height: 400px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; padding: 15px; border-radius: 5px; border: 1px solid #ddd; background-color: #f5f5f5;">${displayHtml}</textarea>
    <button class="copy-button" onclick="copyToClipboard()">
      <i class="fas fa-copy"></i> 复制代码
    </button>
  </div>
  
  <script>
    function copyToClipboard() {
      try {
        const codeElement = document.getElementById('source-code');
        const text = codeElement.textContent;
        
        // 创建一个临时元素来复制文本
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // 显示复制成功消息
        const copyButton = document.querySelector('.copy-button');
        copyButton.innerHTML = '<i class="fas fa-check"></i> 复制成功';
        copyButton.classList.add('copy-success');
        
        // 2秒后恢复按钮状态
        setTimeout(() => {
          copyButton.innerHTML = '<i class="fas fa-copy"></i> 复制代码';
          copyButton.classList.remove('copy-success');
        }, 2000);
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败: ' + error.message);
      }
    }
  </script>
</body>
</html>`);
  } catch (error) {
    console.error('查看源代码时出错:', error);
    res.status(500).send(`查看源代码时出错: ${error.message}`);
  }
});

// 查看提示词
router.get('/view-prompt', (req, res) => {
  try {
    // 获取存储在会话中的提示词
    const systemPrompt = req.session.systemPrompt;
    const fullSystemPrompt = req.session.fullSystemPrompt;
    const userPrompt = req.session.userPrompt;
    
    if (!systemPrompt || !userPrompt) {
      return res.status(404).send('未找到提示词，请先生成卡片');
    }
    
    // 安全转义HTML字符
    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
    
    // 返回一个简单的页面，显示提示词
    res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>查看提示词</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">
  <style>
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
      white-space: pre-wrap;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .back-button {
      display: inline-block;
      padding: 8px 16px;
      background-color: #3498db;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    .tab-buttons {
      display: flex;
      margin-bottom: 20px;
    }
    .tab-button {
      padding: 10px 20px;
      background-color: #f0f0f0;
      border: none;
      cursor: pointer;
      margin-right: 5px;
      border-radius: 4px 4px 0 0;
    }
    .tab-button.active {
      background-color: #3498db;
      color: white;
    }
    .tab-content {
      display: none;
      position: relative;
    }
    .tab-content.active {
      display: block;
    }
    .copy-button {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      background-color: rgba(255, 255, 255, 0.8);
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
      z-index: 10;
    }
    .copy-button:hover {
      background-color: rgba(255, 255, 255, 1);
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .copy-button i {
      font-size: 14px;
    }
    .copy-success {
      background-color: #4CAF50 !important;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>知识卡片提示词</h1>
    
    <div class="tab-buttons">
      <button id="system-tab" class="tab-button active" onclick="showTab('system')">系统提示词</button>
      <button id="full-system-tab" class="tab-button" onclick="showTab('full-system')">完整系统提示词</button>
      <button id="user-tab" class="tab-button" onclick="showTab('user')">用户提示词</button>
    </div>
    
    <a href="javascript:history.back()" class="back-button">返回卡片</a>
  </div>
  
  <div id="system" class="tab-content active">
    <h2>基础系统提示词</h2>
    <pre id="system-prompt">${escapeHtml(systemPrompt)}</pre>
    <button class="copy-button" onclick="copyToClipboard('system-prompt')">
      <i class="fas fa-copy"></i> 复制代码
    </button>
  </div>
  
  <div id="full-system" class="tab-content">
    <h2>完整系统提示词（包含模式调整）</h2>
    <pre id="full-system-prompt">${escapeHtml(fullSystemPrompt)}</pre>
    <button class="copy-button" onclick="copyToClipboard('full-system-prompt')">
      <i class="fas fa-copy"></i> 复制代码
    </button>
  </div>
  
  <div id="user" class="tab-content">
    <h2>用户提示词</h2>
    <pre id="user-prompt">${escapeHtml(userPrompt)}</pre>
    <button class="copy-button" onclick="copyToClipboard('user-prompt')">
      <i class="fas fa-copy"></i> 复制代码
    </button>
  </div>
  
  <script>
    function showTab(tabId) {
      try {
        // 隐藏所有标签内容
        document.querySelectorAll('.tab-content').forEach(tab => {
          tab.classList.remove('active');
        });
        
        // 取消所有标签按钮的活动状态
        document.querySelectorAll('.tab-button').forEach(button => {
          button.classList.remove('active');
        });
        
        // 显示选定的标签内容
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
          tabElement.classList.add('active');
        }
        
        // 设置选定的标签按钮为活动状态
        const buttonElement = document.getElementById(tabId + '-tab');
        if (buttonElement) {
          buttonElement.classList.add('active');
        }
      } catch (error) {
        console.error('切换标签时出错:', error);
      }
    }
    
    function copyToClipboard(elementId) {
      try {
        const codeElement = document.getElementById(elementId);
        const text = codeElement.textContent;
        
        // 创建一个临时元素来复制文本
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // 显示复制成功消息
        const tabId = elementId.replace('-prompt', '');
        const copyButton = document.querySelector('#' + tabId + ' .copy-button');
        copyButton.innerHTML = '<i class="fas fa-check"></i> 复制成功';
        copyButton.classList.add('copy-success');
        
        // 2秒后恢复按钮状态
        setTimeout(() => {
          copyButton.innerHTML = '<i class="fas fa-copy"></i> 复制代码';
          copyButton.classList.remove('copy-success');
        }, 2000);
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败: ' + error.message);
      }
    }
  </script>
</body>
</html>`);
  } catch (error) {
    console.error('查看提示词时出错:', error);
    res.status(500).send(`查看提示词时出错: ${error.message}`);
  }
});

// 自定义卡片样式 API
router.get('/custom-card-styles', async (req, res) => {
  try {
    // 从请求中获取主题词
    const theme = req.query.theme;
    
    if (!theme) {
      return res.status(400).json({ error: '主题词是必需的' });
    }
    
    // 生成基于主题的自定义样式
    const primaryColor = generateColorFromString(theme);
    const secondaryColor = generateComplementaryColor(primaryColor);
    
    // 返回自定义样式
    res.json({
      primaryColor,
      secondaryColor,
      // 可以添加更多基于主题的样式属性
    });
  } catch (error) {
    console.error('生成自定义样式时出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 辅助函数：HTML转义
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 从字符串生成颜色
// @param {string} str 输入字符串
// @returns {string} 颜色代码
function generateColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // 确保颜色不会太暗或太亮
  let r = (hash & 0xFF0000) >> 16;
  let g = (hash & 0x00FF00) >> 8;
  let b = hash & 0x0000FF;
  
  // 调整亮度
  const minBrightness = 30;  // 避免太暗
  const maxBrightness = 220; // 避免太亮
  
  r = Math.max(minBrightness, Math.min(maxBrightness, r));
  g = Math.max(minBrightness, Math.min(maxBrightness, g));
  b = Math.max(minBrightness, Math.min(maxBrightness, b));
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 生成互补色
// @param {string} hexColor 原始颜色
// @returns {string} 互补颜色
function generateComplementaryColor(hexColor) {
  // 移除#前缀
  const hex = hexColor.replace('#', '');
  
  // 转换为RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 计算互补色 (255 - 原色)
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;
  
  // 转换回十六进制
  return `#${((1 << 24) + (compR << 16) + (compG << 8) + compB).toString(16).slice(1)}`;
}

export default router;
