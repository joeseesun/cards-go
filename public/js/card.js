document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const themeDisplay = document.getElementById('theme-display');
  const loadingElement = document.getElementById('loading');
  const cardContainer = document.getElementById('card-container');
  const downloadBtn = document.getElementById('download-btn');
  const shareBtn = document.getElementById('share-btn');
  const regenerateBtn = document.getElementById('regenerate-btn');
  const dynamicStyles = document.getElementById('dynamic-styles');
  
  // 加载卡片样式 CSS
  loadCardStyles();
  
  /**
   * 动态加载卡片样式 CSS
   */
  async function loadCardStyles() {
    try {
      // 获取 URL 参数
      const urlParams = new URLSearchParams(window.location.search);
      const theme = urlParams.get('theme');
      const aspectRatio = urlParams.get('aspectRatio');
      const cardsPerRow = urlParams.get('cardsPerRow');
      
      // 构建自定义样式 URL
      const styleParams = new URLSearchParams();
      if (theme) styleParams.append('theme', theme);
      if (aspectRatio) styleParams.append('aspectRatio', aspectRatio);
      if (cardsPerRow) styleParams.append('cardsPerRow', cardsPerRow);
      
      // 使用 fetch 获取自定义卡片样式
      const response = await fetch(`/api/custom-card-styles?${styleParams.toString()}`);
      if (!response.ok) {
        throw new Error('加载卡片样式失败');
      }
      
      // 获取 CSS 内容
      const cssContent = await response.text();
      
      // 创建 style 元素并插入 CSS 内容
      const styleElement = document.createElement('style');
      styleElement.textContent = cssContent;
      
      // 将 style 元素添加到 dynamicStyles 容器中
      dynamicStyles.appendChild(styleElement);
      
      console.log('卡片样式加载成功');
    } catch (error) {
      console.error('加载卡片样式时出错:', error);
      
      // 如果加载自定义样式失败，尝试加载默认样式
      try {
        const fallbackResponse = await fetch('/css/card-styles.css');
        if (fallbackResponse.ok) {
          const fallbackCss = await fallbackResponse.text();
          const fallbackStyle = document.createElement('style');
          fallbackStyle.textContent = fallbackCss;
          dynamicStyles.appendChild(fallbackStyle);
          console.log('已加载默认卡片样式');
        }
      } catch (fallbackError) {
        console.error('加载默认样式也失败:', fallbackError);
      }
    }
  }
  
  // Get parameters from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const theme = urlParams.get('theme');
  
  // If no theme is provided, redirect back to the homepage
  if (!theme) {
    window.location.href = '/';
    return;
  }
  
  // Display the theme
  themeDisplay.textContent = theme;
  document.title = `${theme} | Cards-Go`;
  
  // Get all configuration parameters from URL
  const config = {
    // 数字类型参数
    quoteCount: getNumberParam('quoteCount'),
    cardsPerRow: getNumberParam('cardsPerRow'),
    maxQuoteLength: getNumberParam('maxQuoteLength'),
    contextLength: getNumberParam('contextLength'),
    // 字符串类型参数
    aspectRatio: urlParams.get('aspectRatio'),
    // 风格选择参数（逗号分隔的字符串转为数组）
    styleSelection: urlParams.get('styleSelection') ? urlParams.get('styleSelection').split(',') : []
  };
  
  // 辅助函数：从URL参数中获取数字类型参数
  function getNumberParam(name) {
    const value = urlParams.get(name);
    return value ? parseInt(value) : undefined;
  }
  
  // 保存当前配置，用于重新生成
  let currentConfig = { ...config };
  
  // Function to generate cards
  async function generateCards(configOverrides = {}) {
    try {
      // Show loading animation
      loadingElement.style.display = 'block';
      cardContainer.style.display = 'none';
      
      // 合并当前配置和覆盖参数
      const finalConfig = { ...currentConfig, ...configOverrides };
      currentConfig = { ...finalConfig }; // 更新当前配置
      
      // 准备API请求参数
      const apiParams = { theme, ...finalConfig };
      
      // 移除undefined的参数
      Object.keys(apiParams).forEach(key => {
        if (apiParams[key] === undefined) {
          delete apiParams[key];
        }
      });
      
      console.log('Generating cards with params:', apiParams);
      
      // Call the API to generate cards
      const response = await fetch('/api/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiParams)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '生成卡片时出错';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Insert the HTML content
      let htmlContent = data.html;
      
      // 处理可能的 ```html {content}``` 或 ```html{{content}}``` 格式
      // 先尝试匹配 ```html {content}``` 格式
      let htmlCodeBlockRegex = /```html\s*([\s\S]*?)```/;
      let match = htmlContent.match(htmlCodeBlockRegex);
      if (match && match[1]) {
        console.log('检测到代码块格式 ```html {content}```，提取内容');
        htmlContent = match[1].trim();
      }
      
      // 再尝试匹配 ```html{{content}}``` 格式
      htmlCodeBlockRegex = /```html\{\{([\s\S]*?)\}\}```/;
      match = htmlContent.match(htmlCodeBlockRegex);
      if (match && match[1]) {
        console.log('检测到代码块格式 ```html{{content}}```，提取内容');
        htmlContent = match[1].trim();
      }
      
      // 最后尝试匹配单独的 {{content}} 格式
      const contentRegex = /\{\{([\s\S]*?)\}\}/;
      match = htmlContent.match(contentRegex);
      if (match && match[1]) {
        console.log('检测到 {{content}} 格式，提取内容');
        htmlContent = match[1].trim();
      }
      
      cardContainer.innerHTML = htmlContent;
      
      // Hide loading and show cards
      loadingElement.style.display = 'none';
      cardContainer.style.display = 'block';
      
      // Enable action buttons
      downloadBtn.disabled = false;
      shareBtn.disabled = false;
    } catch (error) {
      console.error('Error generating cards:', error);
      alert(`错误: ${error.message}`);
      loadingElement.style.display = 'none';
    }
  }
  
  // Generate cards when the page loads
  generateCards();
  
  // Handle regenerate button click
  regenerateBtn.addEventListener('click', generateCards);
  
  // Handle download button click
  downloadBtn.addEventListener('click', async () => {
    try {
      // Check if html2canvas is loaded
      if (typeof html2canvas === 'undefined') {
        throw new Error('下载功能未加载，请刷新页面重试');
      }
      
      alert('正在准备下载，请稍候...');
      
      // Use html2canvas to convert the cards to an image
      const canvas = await html2canvas(cardContainer, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true
      });
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `cards-go-${theme}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading cards:', error);
      alert(`下载失败: ${error.message}`);
    }
  });
  
  // 查看源代码按钮点击事件
  const viewSourceBtn = document.getElementById('view-source-btn');
  if (viewSourceBtn) {
    viewSourceBtn.addEventListener('click', () => {
      // 在新窗口打开源代码页面
      window.open('/api/view-source', '_blank');
    });
  }
  
  // 查看提示词按钮点击事件
  const viewPromptBtn = document.getElementById('view-prompt-btn');
  if (viewPromptBtn) {
    viewPromptBtn.addEventListener('click', () => {
      // 在新窗口打开提示词页面
      window.open('/api/view-prompt', '_blank');
    });
  }
  
  // Handle share button click
  shareBtn.addEventListener('click', () => {
    try {
      // Check if Web Share API is supported
      if (navigator.share) {
        navigator.share({
          title: `${theme} | Cards-Go`,
          text: `查看我用Cards-Go生成的关于${theme}的精美知识卡片！`,
          url: window.location.href
        }).then(() => {
          console.log('分享成功');
        }).catch((error) => {
          console.error('分享失败:', error);
        });
      } else {
        // 如果不支持Web Share API，提供复制链接的选项
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
          alert('链接已复制到剪贴板，你可以手动分享');
        }).catch(() => {
          alert('无法复制链接，请手动复制地址栏中的URL');
        });
      }
    } catch (error) {
      console.error('分享时出错:', error);
      alert(`分享失败: ${error.message}`);
    }
  });
});

