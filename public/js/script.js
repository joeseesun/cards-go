document.addEventListener('DOMContentLoaded', async () => {
  // 初始化加载页面（如果当前在加载页面）
  initLoadingPage();
  
  // Get DOM elements
  const themeForm = document.getElementById('theme-form');
  const themeInput = document.getElementById('theme-input');
  const exampleTags = document.querySelectorAll('.tag');
  const resetDefaultsBtn = document.getElementById('reset-defaults');
  
  // Get input elements
  const quoteCountInput = document.getElementById('quote-count');
  const aspectRatioSelect = document.getElementById('aspect-ratio');
  const cardsPerRowInput = document.getElementById('cards-per-row');
  const maxQuoteLengthInput = document.getElementById('max-quote-length');
  const contextLengthInput = document.getElementById('context-length');
  const maxHeightInput = document.getElementById('max-height');
  const minHeightInput = document.getElementById('min-height');
  const modeRadios = document.querySelectorAll('input[name="mode"]'); // 使用单选按钮而非下拉菜单
  const styleModeRadios = document.querySelectorAll('input[name="style-mode"]');
  const styleSelector = document.getElementById('style-selector');
  const styleGrid = document.getElementById('style-grid');
  
  // AI模型选择元素
  const aiProviderSelect = document.getElementById('ai-provider');
  const aiModelSelect = document.getElementById('ai-model');
  
  // Default values (matching those in prompts/card.js)
  const defaultConfig = {
    quoteCount: 8,
    aspectRatio: '16:9',
    cardsPerRow: 2,
    maxQuoteLength: 100,
    contextLength: 30,
    styleSelection: [],
    mode: 'creative', // 默认使用创造性模式
    maxHeight: 383, // 默认卡片最大高度(px)
    minHeight: null, // 默认不设置最小高度
    provider: 'ark', // 默认使用 ARK AI
    model: 'ep-20250330093147-r2gkz' // 默认使用 ARK 默认模型
  };
  
  // Store the current configuration
  let currentConfig = { ...defaultConfig };
  
  // Handle number input increment/decrement buttons
  document.querySelectorAll('.number-input').forEach(container => {
    const input = container.querySelector('input');
    const decrementBtn = container.querySelector('.decrement');
    const incrementBtn = container.querySelector('.increment');
    const inputId = input.id;
    
    // 高度输入框不进行校验
    if (inputId === 'max-height' || inputId === 'min-height') {
      decrementBtn.addEventListener('click', () => {
        const step = 10;
        const newValue = parseInt(input.value) - step;
        input.value = newValue;
        updateConfigFromInputs();
      });
      
      incrementBtn.addEventListener('click', () => {
        const step = 10;
        const newValue = parseInt(input.value) + step;
        input.value = newValue;
        updateConfigFromInputs();
      });
      
      input.addEventListener('change', () => {
        updateConfigFromInputs();
      });
    } else {
      // 其他输入框保持原有校验逻辑
      decrementBtn.addEventListener('click', () => {
        const min = parseInt(input.min) || 0;
        const step = parseInt(input.step) || 1;
        const newValue = parseInt(input.value) - step;
        input.value = newValue < min ? min : newValue;
        updateConfigFromInputs();
      });
      
      incrementBtn.addEventListener('click', () => {
        const max = parseInt(input.max) || 100;
        const step = parseInt(input.step) || 1;
        const newValue = parseInt(input.value) + step;
        input.value = newValue > max ? max : newValue;
        updateConfigFromInputs();
      });
      
      input.addEventListener('change', () => {
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 100;
        let value = parseInt(input.value);
        
        if (isNaN(value)) {
          value = parseInt(input.defaultValue) || min;
        }
        
        input.value = Math.max(min, Math.min(max, value));
        updateConfigFromInputs();
      });
    }
  });
  
  // 创建一个独立的选项卡切换函数
  function initTabSwitching() {
    console.log('初始化选项卡切换功能');
    
    // 获取所有选项卡按钮和内容
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (!tabButtons || tabButtons.length === 0) {
      console.error('找不到选项卡按钮');
      return;
    }
    
    console.log('找到', tabButtons.length, '个选项卡按钮');
    
    // 移除现有的点击事件处理程序，避免重复
    tabButtons.forEach(button => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });
    
    // 重新获取按钮并添加新的事件处理程序
    const newTabButtons = document.querySelectorAll('.tab-btn');
    
    newTabButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const tabName = this.getAttribute('data-tab');
        console.log('点击选项卡:', tabName);
        
        // 移除所有标签的活动状态
        newTabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // 添加当前标签的活动状态
        this.classList.add('active');
        
        // 显示对应的内容
        const tabContent = document.getElementById('tab-' + tabName);
        if (tabContent) {
          tabContent.classList.add('active');
          console.log('切换到选项卡:', 'tab-' + tabName);
          
          // 如果是风格设置标签，确保风格选项已加载
          if (tabName === 'style' && styleGrid && styleGrid.children.length === 0) {
            loadDesignStyles();
          }
        } else {
          console.error('找不到选项卡内容:', 'tab-' + tabName);
        }
      });
    });
  }
  
  // 在页面加载完成后初始化所有功能
  window.addEventListener('load', () => {
    console.log('页面加载完成');
    
    // 如果风格选择器为空，则加载设计风格
    if (styleGrid && styleGrid.children.length === 0) {
      loadDesignStyles();
    }
    
    // 初始化AI模型选择器
    if (aiProviderSelect && aiModelSelect) {
      initAIModelSelector();
    }
    
    // 初始化选项卡切换功能
    setTimeout(initTabSwitching, 100); // 稍微延迟以确保 DOM 已完全加载
    
    // 创建独立的风格模式选择器初始化函数
    function initStyleModeSelector() {
      console.log('初始化风格模式选择器');
      
      const styleModeOptions = document.querySelectorAll('.style-mode-option');
      const styleModeSlider = document.querySelector('.style-mode-slider');
      
      if (!styleModeOptions || styleModeOptions.length === 0 || !styleModeSlider) {
        console.error('找不到风格模式选项或滑块');
        return;
      }
      
      console.log('找到', styleModeOptions.length, '个风格模式选项');
      
      // 移除现有的点击事件处理程序，避免重复
      styleModeOptions.forEach(option => {
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
      });
      
      // 重新获取选项并添加新的事件处理程序
      const newStyleModeOptions = document.querySelectorAll('.style-mode-option');
      
      // 初始化选中状态
      newStyleModeOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio && radio.checked) {
          const position = option.getAttribute('data-position');
          styleModeSlider.className = 'style-mode-slider position-' + position;
          option.classList.add('active');
          
          // 处理初始风格选择器的显示/隐藏
          if (radio.value === 'random') {
            styleSelector.classList.add('hidden');
          } else {
            styleSelector.classList.remove('hidden');
          }
        }
        
        // 添加点击事件
        option.addEventListener('click', function(e) {
          const radio = option.querySelector('input[type="radio"]');
          if (radio) {
            radio.checked = true;
            console.log('风格模式已更改为:', radio.value);
            
            // 更新活动状态
            newStyleModeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            // 移动滑块
            const position = option.getAttribute('data-position');
            styleModeSlider.className = 'style-mode-slider position-' + position;
            
            // 处理风格选择器的显示/隐藏
            const styleMode = radio.value;
            if (styleMode === 'random') {
              styleSelector.classList.add('hidden');
              currentConfig.styleSelection = [];
            } else {
              // 确保风格选择器中有内容
              if (styleGrid && styleGrid.children.length === 0) {
                loadDesignStyles();
              }
              
              styleSelector.classList.remove('hidden');
              // 切换模式时重置选择
              if (styleMode === 'single') {
                // 单一模式下，只允许一个选择
                document.querySelectorAll('.style-card.selected').forEach((card, index) => {
                  if (index > 0) card.classList.remove('selected');
                });
                
                // 如果有多个选择，只保留第一个
                if (currentConfig.styleSelection.length > 1) {
                  currentConfig.styleSelection = [currentConfig.styleSelection[0]];
                }
              }
            }
            
            // 更新配置
            updateConfigFromInputs();
          }
        });
      });
    }
    
    // 初始化风格模式选择器
    setTimeout(initStyleModeSelector, 200);
    
    // 创建独立的内容处理模式选择器初始化函数
    function initContentModeSelector() {
      console.log('初始化内容处理模式选择器');
      
      const modeOptions = document.querySelectorAll('.mode-option');
      const modeSlider = document.querySelector('.mode-slider');
      
      if (!modeOptions || modeOptions.length === 0 || !modeSlider) {
        console.error('找不到内容处理模式选项或滑块');
        return;
      }
      
      console.log('找到', modeOptions.length, '个内容处理模式选项');
      
      // 移除现有的点击事件处理程序，避免重复
      modeOptions.forEach(option => {
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
      });
      
      // 重新获取选项并添加新的事件处理程序
      const newModeOptions = document.querySelectorAll('.mode-option');
      
      // 初始化选中状态
      newModeOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio && radio.checked) {
          const position = option.getAttribute('data-position');
          modeSlider.className = 'mode-slider position-' + position;
          option.classList.add('active');
        }
        
        // 添加点击事件
        option.addEventListener('click', function(e) {
          const radio = option.querySelector('input[type="radio"]');
          if (radio) {
            radio.checked = true;
            console.log('内容处理模式已更改为:', radio.value);
            
            // 更新活动样式
            newModeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            // 移动滑块
            const position = option.getAttribute('data-position');
            modeSlider.className = 'mode-slider position-' + position;
            
            // 更新配置
            updateConfigFromInputs();
          }
        });
      });
    }
    
    // 初始化内容处理模式选择器
    setTimeout(initContentModeSelector, 300);
    
    // 预先加载风格选项，而不是等待用户点击
    loadDesignStyles();
  });
  
  // Reset to defaults
  resetDefaultsBtn.addEventListener('click', () => {
    resetToDefaults();
  });
  
  // 注意：风格模式选择器的事件处理已在页面加载事件中处理，此处不再重复
  
  // Handle select and input changes
  aspectRatioSelect.addEventListener('change', updateConfigFromInputs);
  quoteCountInput.addEventListener('input', updateConfigFromInputs);
  cardsPerRowInput.addEventListener('input', updateConfigFromInputs);
  maxQuoteLengthInput.addEventListener('input', updateConfigFromInputs);
  contextLengthInput.addEventListener('input', updateConfigFromInputs);
  
  // 为内容处理模式单选按钮添加事件监听器
  modeRadios.forEach(radio => {
    radio.addEventListener('change', updateConfigFromInputs);
  });
  
  // Load design styles from the server
  async function loadDesignStyles() {
    try {
      const response = await fetch('/api/design-styles');
      if (!response.ok) {
        throw new Error('获取设计风格失败');
      }
      
      const styles = await response.json();
      renderStyleGrid(styles);
    } catch (error) {
      console.error('Error loading design styles:', error);
      styleGrid.innerHTML = '<p class="error-message">加载设计风格时出错</p>';
    }
  }
  
  // Render the style grid
  function renderStyleGrid(styles) {
    styleGrid.innerHTML = '';
    
    styles.forEach(style => {
      const card = document.createElement('div');
      card.className = 'style-card';
      card.dataset.code = style.code;
      
      // Check if this style is in the current selection
      if (currentConfig.styleSelection.includes(style.code)) {
        card.classList.add('selected');
      }
      
      card.innerHTML = `
        <div class="style-name">${style.name}</div>
        <div class="style-code">${style.code}</div>
      `;
      
      card.addEventListener('click', () => {
        const styleMode = document.querySelector('input[name="style-mode"]:checked').value;
        const code = style.code;
        
        if (styleMode === 'single') {
          // In single mode, only allow one selection
          document.querySelectorAll('.style-card').forEach(c => {
            c.classList.remove('selected');
          });
          card.classList.add('selected');
          currentConfig.styleSelection = [code];
        } else if (styleMode === 'multiple') {
          // In multiple mode, toggle selection
          card.classList.toggle('selected');
          
          if (card.classList.contains('selected')) {
            // Add to selection if not already there
            if (!currentConfig.styleSelection.includes(code)) {
              currentConfig.styleSelection.push(code);
            }
          } else {
            // Remove from selection
            currentConfig.styleSelection = currentConfig.styleSelection.filter(c => c !== code);
          }
        }
      });
      
      styleGrid.appendChild(card);
    });
  }
  
  // Update configuration from input values
  function updateConfigFromInputs() {
    currentConfig.quoteCount = parseInt(quoteCountInput.value);
    currentConfig.aspectRatio = aspectRatioSelect.value;
    currentConfig.cardsPerRow = parseInt(cardsPerRowInput.value);
    currentConfig.maxQuoteLength = parseInt(maxQuoteLengthInput.value);
    currentConfig.contextLength = parseInt(contextLengthInput.value);
    
    // 处理卡片高度设置 - 直接使用输入值，不进行校验
    currentConfig.maxHeight = maxHeightInput.value ? parseInt(maxHeightInput.value) : null;
    currentConfig.minHeight = minHeightInput.value ? parseInt(minHeightInput.value) : null;
    
    // 获取表单中选中的内容处理模式
    const formModeRadios = document.querySelectorAll('.mode-option input[name="mode"]');
    formModeRadios.forEach(radio => {
      if (radio.checked) {
        currentConfig.mode = radio.value;
      }
    });
    
    // 更新AI提供商和模型设置
    if (aiProviderSelect && aiModelSelect) {
      const oldProvider = currentConfig.provider;
      const oldModel = currentConfig.model;
      
      currentConfig.provider = aiProviderSelect.value;
      currentConfig.model = aiModelSelect.value;
      
      console.log('AI提供商更新:', oldProvider, '->', currentConfig.provider);
      console.log('AI模型更新:', oldModel, '->', currentConfig.model);
      console.log('当前配置对象:', JSON.stringify(currentConfig));
    }
    
    // styleSelection is updated in the style card click handlers
  }
  
  // Reset all inputs to default values
  function resetToDefaults() {
    quoteCountInput.value = defaultConfig.quoteCount;
    aspectRatioSelect.value = defaultConfig.aspectRatio;
    cardsPerRowInput.value = defaultConfig.cardsPerRow;
    maxQuoteLengthInput.value = defaultConfig.maxQuoteLength;
    contextLengthInput.value = defaultConfig.contextLength;
    maxHeightInput.value = defaultConfig.maxHeight || 383;
    minHeightInput.value = defaultConfig.minHeight || 0;
    
    // 重置AI提供商和模型设置
    if (aiProviderSelect && aiModelSelect) {
      aiProviderSelect.value = defaultConfig.provider;
      // 触发提供商变化事件，更新模型列表
      const event = new Event('change');
      aiProviderSelect.dispatchEvent(event);
    }
    
    // 重置表单中的内容处理模式分段控制器
    const formModeRadios = document.querySelectorAll('.mode-option input[name="mode"]');
    const modeOptions = document.querySelectorAll('.mode-option');
    const modeSlider = document.querySelector('.mode-slider');
    
    formModeRadios.forEach(radio => {
      const option = radio.closest('.mode-option');
      if (radio.value === defaultConfig.mode) {
        radio.checked = true;
        option.classList.add('active');
        const position = option.getAttribute('data-position');
        modeSlider.className = 'mode-slider position-' + position;
      } else {
        radio.checked = false;
        option.classList.remove('active');
      }
    });
    
    // Reset style selection to random
    document.querySelector('input[name="style-mode"][value="random"]').checked = true;
    styleSelector.classList.add('hidden');
    
    // Clear all selected styles
    document.querySelectorAll('.style-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    currentConfig = { ...defaultConfig };
  }
  
  // 创建加载页面的 JavaScript 代码
  // 这个函数会在加载页面被加载时自动执行
  function initLoadingPage() {
    // 检查是否在加载页面
    if (window.location.pathname === '/loading') {
      // 获取 URL 参数
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('theme')) {
        // 如果 URL 中有主题参数，则开始生成卡片
        generateCardsWithLoading(urlParams.toString());
      } else {
        // 如果没有主题参数，返回首页
        window.location.href = '/';
      }
    }
  }

  // 在加载页面中生成卡片
  function generateCardsWithLoading(params) {
    // 创建加载页面的 UI 元素
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
      loadingContainer.innerHTML = `
        <div style="max-width: 500px; padding: 30px; background-color: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          <div style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
          <h1 style="color: #333; margin-bottom: 20px;">正在生成卡片</h1>
          <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">AI 正在分析内容生成卡片，这可能需要 15-60 秒。</p>
          <div style="height: 6px; background-color: #f3f3f3; border-radius: 3px; margin-bottom: 20px; overflow: hidden;">
            <div style="height: 100%; width: 0%; background-color: #3498db; border-radius: 3px; animation: progress 30s linear forwards;"></div>
          </div>
          <a href="/" style="display: inline-block; padding: 10px 20px; background-color: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 16px;">取消并返回</a>
        </div>
      `;

      // 添加动画样式
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { width: 0%; }
          90% { width: 90%; }
          100% { width: 90%; }
        }
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
      `;
      document.head.appendChild(style);

      // 添加字体
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap';
      document.head.appendChild(fontLink);
    }

    // 将 URL 参数转换为对象
    const urlParams = new URLSearchParams(params);
    const paramsObj = {};
    
    for (const [key, value] of urlParams.entries()) {
      paramsObj[key] = value;
    }
    
    // 处理 styleSelection 数组
    if (paramsObj.styleSelection) {
      paramsObj.styleSelection = paramsObj.styleSelection.split(',');
    }
    
    // 使用正确的 API 端点发送请求
    console.log('发送卡片生成 POST 请求，参数:', JSON.stringify(paramsObj));
    console.log('AI 提供商:', paramsObj.provider);
    console.log('AI 模型:', paramsObj.model);
    
    // 创建 POST 请求 - 确保使用正确的端点 /api/generate-card
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/generate-card', true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    
    // 发送 JSON 数据，确保包含 provider 和 model 参数
    const jsonData = JSON.stringify(paramsObj);
    console.log('发送到后端的 JSON 数据:', jsonData);
    xhr.send(jsonData);
    
    // 监听请求完成
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          // 解析JSON响应
          const response = JSON.parse(xhr.responseText);
          
          // 检查是否有HTML内容
          if (response && response.html) {
            console.log('收到HTML内容，长度:', response.html.length);
            // 将生成的 HTML 写入到新文档
            document.open();
            document.write(response.html);
            document.close();
          } else {
            console.error('服务器返回的JSON中没有HTML内容');
            throw new Error('服务器返回的JSON中没有HTML内容');
          }
        } catch (error) {
          console.error('处理服务器响应时出错:', error);
          // 显示错误信息
          if (loadingContainer) {
            loadingContainer.innerHTML = `
              <div style="max-width: 500px; padding: 30px; background-color: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                <h1 style="color: #e74c3c; margin-bottom: 20px;">生成失败</h1>
                <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">处理服务器响应时出错: ${error.message}</p>
                <a href="/" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 16px;">返回首页</a>
              </div>
            `;
          }
        }
      } else {
        // 如果出错，显示错误信息
        if (loadingContainer) {
          loadingContainer.innerHTML = `
            <div style="max-width: 500px; padding: 30px; background-color: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #e74c3c; margin-bottom: 20px;">生成失败</h1>
              <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">生成卡片时出现错误，请重试。</p>
              <a href="/" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 16px;">返回首页</a>
            </div>
          `;
        }
      }
    };
    
    // 处理请求错误
    xhr.onerror = function() {
      if (loadingContainer) {
        loadingContainer.innerHTML = `
          <div style="max-width: 500px; padding: 30px; background-color: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #e74c3c; margin-bottom: 20px;">连接错误</h1>
            <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">无法连接到服务器，请检查您的网络连接并重试。</p>
            <a href="/" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 16px;">返回首页</a>
          </div>
        `;
      }
    };
    
    // 发送请求
    xhr.send();
  }
  
  // Handle form submission
  themeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const theme = themeInput.value.trim();
    if (!theme) {
      alert('请输入主题词');
      return;
    }
    
    // 记录当前配置对象，用于调试
    console.log('提交表单时的配置对象:', JSON.stringify(currentConfig));
    console.log('AI提供商:', currentConfig.provider);
    console.log('AI模型:', currentConfig.model);
    
    // 检查AI提供商选择器的当前值
    if (aiProviderSelect) {
      console.log('AI提供商选择器当前值:', aiProviderSelect.value);
    }
    
    // 检查AI模型选择器的当前值
    if (aiModelSelect) {
      console.log('AI模型选择器当前值:', aiModelSelect.value);
    }
    
    // Build query parameters with all configuration options
    const params = new URLSearchParams();
    params.append('theme', theme);
    
    // Add all configuration parameters
    Object.entries(currentConfig).forEach(([key, value]) => {
      if (key === 'styleSelection' && Array.isArray(value)) {
        // Handle array of style codes
        if (value.length > 0) {
          params.append(key, value.join(','));
        }
      } else {
        params.append(key, value);
      }
    });
    
    // 记录最终的URL参数
    console.log('最终URL参数:', params.toString());
    console.log('provider参数:', params.get('provider'));
    console.log('model参数:', params.get('model'));
    
    // 跳转到加载页面
    window.location.href = `/loading?${params.toString()}`;
  });
  
  // Handle example tag clicks - now insert example text instead of just the theme word
  exampleTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const theme = tag.dataset.theme;
      // u4e3au6bcfu4e2au70edu95e8u4e3bu9898u63d0u4f9bu4e00u6bb5u793au4f8bu6587u672c
      const exampleTexts = {
        'u5e78u798f': 'u5e78u798fu4e0du662fu7f8eu597du7684u751fu6d3bu6761u4ef6uff0cu800cu662fu5bf9u751fu6d3bu7684u6ee1u610fu3002u5b83u4e0du5728u4e8eu62e5u6709u591au5c11uff0cu800cu5728u4e8eu611fu6fc0u591au5c11u3002u5e78u798fu662fu5185u5fc3u7684u5e73u9759uff0cu662fu751fu6d3bu7684u5145u5b9euff0cu662fu4e0eu81eau5df1u548cu89e3u3002u5b83u4e0du662fu7ec8u70b9uff0cu800cu662fu4e00u6bb5u65c5u7a0bu3002u5e78u798fu4e0du662fu5bf9u5b8cu7f8eu7684u8ffdu6c42uff0cu800cu662fu5bf9u4e0du5b8cu7f8eu7684u63a5u7eb3u3002u5e78u798fu5728u4e8eu5f53u4e0buff0cu5728u4e8eu6bcfu4e00u4e2au5faeu5c0fu7684u77acu95f4u3002',
        'u6210u957f': 'u6210u957fu662fu4e00u4e2au4e0du65adu6253u7834u81eau6211u8fb9u754cu7684u8fc7u7a0bu3002u5b83u610fu5473u7740u79bbu5f00u8212u9002u533auff0cu62e5u62b1u672au77e5u3002u6210u957fu4e0du662fu7ebfu6027u7684uff0cu800cu662fu5145u6ee1u8f6cu6298u548cu5faau73afu7684u3002u5f53u6211u4eecu9762u5bf9u6311u6218u65f6uff0cu6211u4eecu5c31u5728u6210u957fu3002u5f53u6211u4eecu4eceu5931u8d25u4e2du5b66u4e60u65f6uff0cu6211u4eecu5c31u5728u6210u957fu3002u5f53u6211u4eecu62e5u6709u52c7u6c14u6539u53d8u65f6uff0cu6211u4eecu5c31u5728u6210u957fu3002u6210u957fu662fu4e00u751fu7684u65c5u7a0buff0cu6ca1u6709u7ec8u70b9uff0cu53eau6709u65b0u7684u5f00u59cbu3002',
        'u667au6167': 'u667au6167u4e0du540cu4e8eu77e5u8bc6u3002u77e5u8bc6u662fu77e5u9053u4e8bu5b9euff0cu800cu667au6167u662fu7406u89e3u771fu7406u3002u77e5u8bc6u662fu5de5u5177uff0cu667au6167u662fu5982u4f55u4f7fu7528u8fd9u4e9bu5de5u5177u3002u667au6167u6765u81eau4e8eu7ecfu9a8cu3001u53cdu601du548cu6df1u5165u601du8003u3002u5b83u662fu77e5u9053u4ec0u4e48u65f6u5019u8bf4u8bdduff0cu4ec0u4e48u65f6u5019u4fddu6301u6c89u9ed8u3002u667au6167u662fu77e5u9053u4ec0u4e48u662fu91cdu8981u7684uff0cu4ec0u4e48u662fu4e0du91cdu8981u7684u3002u667au6167u662fu770bu5230u8868u9762u4e4bu4e0buff0cu542cu5230u8bddu8bedu4e4bu5916uff0cu611fu53d7u5230u884cu52a8u4e4bu540eu3002',
        'u7231u60c5': 'u7231u60c5u662fu4e00u79cdu9009u62e9uff0cu4e00u79cdu627fu8bfauff0cu4e00u79cdu6bcfu5929u90fdu8981u91cdu65b0u505au51fau7684u51b3u5b9au3002u7231u60c5u4e0du4ec5u4ec5u662fu611fu89c9uff0cu66f4u662fu884cu52a8u3002u7231u60c5u662fu5728u5bf9u65b9u6700u8106u5f31u7684u65f6u5019u7ed9u4e88u529bu91cfuff0cu5728u6700u9ed1u6697u7684u65f6u5019u7ed9u4e88u5149u660eu3002u7231u60c5u662fu5305u5bb9u3001u7406u89e3u548cu5c0au91cdu3002u7231u60c5u662fu770bu89c1u5bf9u65b9u7684u4e0du5b8cu7f8euff0cu5374u4ecdu7136u9009u62e9u7559u4e0bu3002u7231u60c5u662fu5728u6240u6709u7406u7531u90fdu544au8bc9u4f60u653eu5f03u65f6uff0cu4f9du7136u9009u62e9u575au6301u3002',
        'u81eau7531': 'u81eau7531u4e0du662fu65e0u6cd5u65e0u5929uff0cu800cu662fu5728u9009u62e9u4e2du627eu5230u81eau6211u3002u771fu6b63u7684u81eau7531u662fu5185u5fc3u7684u72b6u6001uff0cu662fu5bf9u81eau5df1u7684u9009u62e9u8d1fu8d23u3002u81eau7531u4e0du662fu6ca1u6709u9650u5236uff0cu800cu662fu5728u9650u5236u4e2du521bu9020u53efu80fdu3002u81eau7531u662fu80fdu591fu8bf4u201cu4e0du201duff0cu4e5fu80fdu591fu8bf4u201cu662fu201du3002u81eau7531u662fu9009u62e9u81eau5df1u7684u9053u8defuff0cu5e76u4e3au81eau5df1u7684u9009u62e9u8d1fu8d23u3002u81eau7531u4e0du662fu6ca1u6709u6050u60e7uff0cu800cu662fu5728u6050u60e7u4e2du4ecdu7136u524du884cu3002'
      };
      
      // u5982u679cu6709u5bf9u5e94u7684u793au4f8bu6587u672cuff0cu5219u4f7fu7528u5b83uff0cu5426u5219u4ec5u4f7fu7528u4e3bu9898u8bcd
      themeInput.value = exampleTexts[theme] || theme;
      
      // u6edau52a8u5230u9876u90e8
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // u805au7126u5230u6587u672cu533a
      themeInput.focus();
    });
  });
  
  // 打赏模态框功能
  const donationBtn = document.getElementById('donation-btn');
  const donationModal = document.getElementById('donation-modal');
  const closeModal = document.querySelector('.close-modal');
  
  if (donationBtn && donationModal) {
    // 点击打赏按钮打开模态框
    donationBtn.addEventListener('click', (e) => {
      e.preventDefault();
      donationModal.style.display = 'block';
      document.body.style.overflow = 'hidden'; // 防止背景滚动
    });
    
    // 点击关闭按钮关闭模态框
    closeModal.addEventListener('click', () => {
      donationModal.style.display = 'none';
      document.body.style.overflow = '';
    });
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
      if (e.target === donationModal) {
        donationModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && donationModal.style.display === 'block') {
        donationModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }
});

// 初始化AI模型选择器
function initAIModelSelector() {
  // 定义可用的模型列表
  const availableModels = {
    'ark': [
      { id: 'ep-20250330093147-r2gkz', name: 'ARK 默认模型' }
    ],
    'tuzi': [
      { id: 'claude-3-7-sonnet-20250219-o', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-7-sonnet-thinking', name: 'Claude 3.7 Sonnet Thinking' },
      { id: 'claude-3-7-sonnet-20250219-fast', name: 'Claude 3.7 Sonnet Fast' },
      { id: 'deepseek-v3-0324', name: 'DeepSeek V3' },
      { id: 'gpt-4o-all', name: 'GPT-4 All' }
    ]
  };
  
  // 当提供商选择变化时更新模型列表
  aiProviderSelect.addEventListener('change', () => {
    const provider = aiProviderSelect.value;
    updateModelOptions(provider, availableModels);
    updateConfigFromInputs();
  });
  
  // 当模型选择变化时更新配置
  aiModelSelect.addEventListener('change', updateConfigFromInputs);
  
  // 初始化模型列表
  updateModelOptions(aiProviderSelect.value, availableModels);
}

// 更新模型选项
function updateModelOptions(provider, availableModels) {
  // 清空当前选项
  aiModelSelect.innerHTML = '';
  
  // 添加新选项
  if (availableModels[provider]) {
    availableModels[provider].forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      
      // 如果是当前配置中的模型，或者是第一个选项且当前配置中没有模型，则设为选中
      if (model.id === currentConfig.model || (model.id === availableModels[provider][0].id && !currentConfig.model)) {
        option.selected = true;
      }
      
      aiModelSelect.appendChild(option);
    });
  }
  
  // 确保当前配置中的模型与选中的模型一致
  currentConfig.model = aiModelSelect.value;
  console.log('设置模型选择器，当前选中模型:', aiModelSelect.value);
}
