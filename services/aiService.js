// AIu670du52a1u5c01u88c5u6a21u5757
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import https from 'https';
import { promisify } from 'util';
import axios from 'axios';

// u52a0u8f7du73afu5883u53d8u91cf
dotenv.config();

// u68c0u67e5APIu5bc6u94a5
if (!process.env.ARK_API_KEY) {
  console.error('Error: ARK_API_KEY is not set in the .env file');
  process.exit(1);
}

// 定义可用的AI服务提供商
export const AI_PROVIDERS = {
  ARK: 'ark',
  TUZI: 'tuzi'
};

// 定义模型列表
export const AVAILABLE_MODELS = {
  [AI_PROVIDERS.ARK]: [
    { id: 'ep-20250330093147-r2gkz', name: 'ARK 默认模型' }
  ],
  [AI_PROVIDERS.TUZI]: [
    { id: 'claude-3-7-sonnet-20250219-o', name: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-7-sonnet-thinking', name: 'Claude 3.7 Sonnet Thinking' },
    { id: 'claude-3-7-sonnet-20250219-fast', name: 'Claude 3.7 Sonnet Fast' },
    { id: 'deepseek-v3-0324', name: 'DeepSeek V3' },
    { id: 'gpt-4o-all', name: 'GPT-4 All' }
  ]
};

// 默认AI提供商和模型
export const DEFAULT_PROVIDER = AI_PROVIDERS.ARK;
export const DEFAULT_MODEL = 'ep-20250330093147-r2gkz';
console.log('默认AI提供商已设置为:', DEFAULT_PROVIDER, '默认模型:', DEFAULT_MODEL);

/**
 * u8c03u7528ARK APIu7684u901au7528u51fdu6570
 * @param {string} prompt - u7528u6237u8f93u5165u7684u63d0u793au8bcd
 * @param {string} systemPrompt - u7cfbu7edfu63d0u793au8bcduff0cu5b9au4e49AIu7684u884cu4e3a
 * @param {string} model - u6a21u578bu540du79f0uff0cu9ed8u8ba4u4f7fu7528u73afu5883u53d8u91cfu4e2du7684u6a21u578bID
 * @param {object} options - u5176u4ed6u9009u9879uff0cu5982u6e29u5ea6u3001u6700u5927tokensu7b49
 * @returns {Promise<object>} - u8fd4u56deAPIu54cdu5e94
 */

export async function callArkAI(prompt, systemPrompt = '你是一个有用的助手。', model = 'ep-20250330093147-r2gkz', options = {}) {
  try {
    // 使用传入的模型 ID 或默认值
    const modelId = model || 'ep-20250330093147-r2gkz';
    console.log('使用 ARK 模型 ID:', modelId);
    
    // 构建消息数组
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    // 构建请求体 - 包含所有必要的参数
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: false,
      temperature: 0.7,
      top_p: 1,
      n: 1,
      presence_penalty: 0,
      frequency_penalty: 0
    };
    
    // 记录请求内容
    console.log('ARK API请求体:', JSON.stringify(requestBody));

    // 发送请求
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('ARK API请求已发送，状态码:', response.status);

    // 处理错误响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ARK API错误响应:', errorText);
      throw new Error(`ARK API request failed: ${response.status} ${errorText}`);
    }

    // 解析并返回结果
    const result = await response.json();
    console.log('ARK API响应成功，返回数据:', JSON.stringify(result).substring(0, 200) + '...');
    return result;
  } catch (error) {
    console.error('Error calling ARK AI:', error);
    throw error;
  }
}

/**
 * u83b7u53d6AIu54cdu5e94u7684u5185u5bb9u6587u672c
 * @param {object} apiResponse - APIu54cdu5e94u5bf9u8c61
 * @returns {string} - u8fd4u56deAIu54cdu5e94u7684u6587u672cu5185u5bb9
 */
export function getAIResponseContent(apiResponse) {
  if (apiResponse?.choices && apiResponse.choices[0] && apiResponse.choices[0].message) {
    return apiResponse.choices[0].message.content;
  }
  throw new Error('Invalid API response format');
}

/**
 * u7b80u5316u7248u8c03u7528u51fdu6570uff0cu76f4u63a5u8fd4u56deAIu54cdu5e94u6587u672c
 * @param {string} prompt - u7528u6237u8f93u5165u7684u63d0u793au8bcd
 * @param {string} systemPrompt - u7cfbu7edfu63d0u793au8bcd
 * @param {object} options - u5176u4ed6u9009u9879
 * @returns {Promise<string>} - u8fd4u56deAIu54cdu5e94u7684u6587u672cu5185u5bb9
 */
/**
 * 调用兔子API的通用函数
 * @param {string} prompt - 用户输入的提示词
 * @param {string} systemPrompt - 系统提示词，定义AI的行为
 * @param {string} model - 模型名称
 * @param {object} options - 其他选项，如温度、最大tokens等
 * @returns {Promise<object>} - 返回API响应
 */
export async function callTuziAI(prompt, systemPrompt = '你是一个有用的助手。', model = 'claude-3-7-sonnet-20250219-o', options = {}) {
  try {
    console.log('=== 调用Tuzi API ===');
    console.log('Tuzi模型ID:', model);
    console.log('Tuzi API密钥:', process.env.TUZI_API_KEY ? process.env.TUZI_API_KEY.substring(0, 5) + '...' : '未设置');
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    // 合并默认选项和用户提供的选项
    const requestOptions = {
      temperature: 0.7,
      max_tokens: 4000,
      ...options
    };
    
    // 构建请求体
    const requestBody = {
      model,
      messages,
      ...requestOptions
    };
    
    // 完整记录请求体，便于调试
    console.log('Tuzi API请求体(完整):', JSON.stringify(requestBody));
    console.log('Tuzi API请求体(摘要):', JSON.stringify(requestBody).substring(0, 200) + '...');

    // 创建一个带超时的 fetch 请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
    
    try {
      console.log('开始发送Tuzi API请求...');
      
      // 记录完整的请求头信息
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TUZI_API_KEY}`
      };
      console.log('Tuzi API请求头:', JSON.stringify(headers).replace(process.env.TUZI_API_KEY, 'sk-***'));
      
      // 模拟 curl 命令，便于对比
      const curlCommand = `curl -s -X POST https://api.tu-zi.com/v1/chat/completions \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${process.env.TUZI_API_KEY.substring(0, 5)}..." \
-d '${JSON.stringify(requestBody)}'`;
      console.log('等效的 curl 命令:', curlCommand.substring(0, 200) + '...');
      
      // 添加一个完全模拟 curl 命令的函数
      const curlStyleRequest = async (url, headers, data) => {
        console.log('执行完全模拟 curl 的请求...');
        
        // 使用 child_process 模块直接执行 curl命令
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        
        // 构建 curl 命令
        let curlCmd = `curl -s -X POST ${url} `;
        
        // 添加请求头
        Object.entries(headers).forEach(([key, value]) => {
          curlCmd += `-H "${key}: ${value}" `;
        });
        
        // 添加请求体
        curlCmd += `-d '${JSON.stringify(data)}'`;
        
        console.log('执行 curl 命令 (已隐藏敏感信息):', 
                  curlCmd.replace(process.env.TUZI_API_KEY, 'sk-***').substring(0, 200) + '...');
        
        try {
          // 执行 curl 命令
          const { stdout, stderr } = await execPromise(curlCmd);
          
          if (stderr) {
            console.error('curl 命令错误:', stderr);
            throw new Error(`curl 命令执行失败: ${stderr}`);
          }
          
          // 解析响应
          try {
            const parsedData = JSON.parse(stdout);
            console.log('curl 命令执行成功，响应:', JSON.stringify(parsedData).substring(0, 200) + '...');
            return { 
              ok: true, 
              status: 200, 
              json: () => Promise.resolve(parsedData),
              headers: { 'content-type': 'application/json' }
            };
          } catch (parseError) {
            console.error('无法解析 curl 响应:', parseError);
            throw new Error(`无法解析 curl 响应: ${parseError.message}`);
          }
        } catch (execError) {
          console.error('curl 命令执行失败:', execError);
          throw execError;
        }
      };
      
      // 保留原来的 HTTPS 请求函数作为备用
      const makeHttpsRequest = (url, options, data) => {
        return new Promise((resolve, reject) => {
          const req = https.request(url, options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
              responseData += chunk;
            });
            
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsedData = JSON.parse(responseData);
                  resolve({ ok: true, status: res.statusCode, json: () => Promise.resolve(parsedData), headers: res.headers });
                } catch (error) {
                  reject(new Error(`无法解析 JSON 响应: ${error.message}`));
                }
              } else {
                reject(new Error(`HTTP 状态码: ${res.statusCode}, 响应: ${responseData}`));
              }
            });
          });
          
          req.on('error', (error) => {
            reject(error);
          });
          
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('请求超时'));
          });
          
          // 设置超时
          req.setTimeout(30000); // 减少超时时间到 30 秒
          
          // 写入请求体
          req.write(data);
          req.end();
        });
      };
      
      // 添加重试机制
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`Tuzi API 请求重试 (${retryCount}/${maxRetries})...`);
            // 在重试前等待一段时间
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
          
          // 首先尝试使用 axios 调用 API
          try {
            console.log('尝试使用 axios 调用 Tuzi API...');
            
            // 使用 axios 调用 API
            const axiosResponse = await axios({
              method: 'post',
              url: 'https://api.tu-zi.com/v1/chat/completions',
              headers: headers,
              data: requestBody,
              timeout: 30000, // 30 秒超时
              // 添加特殊的 HTTPS 配置
              httpsAgent: new https.Agent({
                rejectUnauthorized: true, // 验证 SSL 证书
                secureProtocol: 'TLSv1_2_method' // 强制使用 TLSv1.2
              })
            });
            
            // 将 axios 响应转换为与 fetch 兼容的格式
            response = {
              ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
              status: axiosResponse.status,
              headers: axiosResponse.headers,
              json: () => Promise.resolve(axiosResponse.data)
            };
            console.log('axios 调用 Tuzi API 成功!');
          } catch (axiosError) {
            console.warn('axios 调用 Tuzi API 失败:', axiosError.message);
            console.log('尝试回退到 curl 命令...');
            
            try {
              console.log('尝试使用 curl 命令直接调用 Tuzi API...');
              
              // 使用 curl 命令直接调用 API
              response = await curlStyleRequest('https://api.tu-zi.com/v1/chat/completions', headers, requestBody);
              console.log('curl 命令调用 Tuzi API 成功!');
            } catch (curlError) {
              console.warn('curl 命令调用 Tuzi API 失败:', curlError.message);
              console.log('尝试回退到 Node.js HTTPS 模块...');
              
              try {
                console.log('尝试使用 Node.js 原生 HTTPS 模块发送请求...');
                
                const httpsOptions = {
                  hostname: 'api.tu-zi.com',
                  path: '/v1/chat/completions',
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.TUZI_API_KEY}`,
                    'Content-Length': Buffer.byteLength(JSON.stringify(requestBody))
                  },
                  timeout: 30000 // 30 秒超时
                };
                
                response = await makeHttpsRequest(httpsOptions, httpsOptions, JSON.stringify(requestBody));
                console.log('Node.js HTTPS 请求成功!');
              } catch (httpsError) {
                console.warn('Node.js HTTPS 请求失败:', httpsError.message);
                console.log('尝试回退到 fetch API...');
                
                // 如果 HTTPS 模块失败，尝试使用 fetch
                response = await fetch('https://api.tu-zi.com/v1/chat/completions', {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                  signal: controller.signal // 使用 AbortController 信号来实现超时控制
                });
              }
            }
          }
          
          // 如果请求成功，跳出重试循环
          break;
        } catch (retryError) {
          // 如果是最后一次重试或者是超时错误，则抛出错误
          if (retryCount >= maxRetries || retryError.name === 'AbortError') {
            throw retryError;
          }
          
          console.warn(`Tuzi API 请求失败 (${retryCount}/${maxRetries}): ${retryError.message}`);
          retryCount++;
        }
      }
      
      // 清除超时计时器
      clearTimeout(timeoutId);
      
      console.log('Tuzi API请求已发送，状态码:', response.status);
      console.log('Tuzi API响应头:', JSON.stringify(Object.fromEntries([...response.headers])));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tuzi API错误响应:', errorText);
        throw new Error(`Tuzi API request failed: ${response.status} ${errorText}`);
      }

      console.log('Tuzi API响应成功，开始解析响应...');
      const result = await response.json();
      console.log('Tuzi API响应内容:', JSON.stringify(result).substring(0, 200) + '...');
      console.log('=== Tuzi API调用完成 ===');
      return result;
    } catch (fetchError) {
      // 清除超时计时器
      clearTimeout(timeoutId);
      
      // 检查是否是超时错误
      if (fetchError.name === 'AbortError') {
        console.error('Tuzi API 请求超时');
        throw new Error('Tuzi API request timed out after 60 seconds');
      }
      
      // 检查是否是网络连接问题
      if (fetchError.code === 'ECONNRESET' || fetchError.code === 'ENOTFOUND' || fetchError.code === 'ETIMEDOUT') {
        console.error(`Tuzi API 网络连接错误: ${fetchError.code}`, fetchError);
        throw new Error(`Tuzi API network connection error: ${fetchError.code} - ${fetchError.message}`);
      }
      
      // 其他网络错误
      console.error('Tuzi API 网络错误:', fetchError);
      throw new Error(`Tuzi API request failed: ${fetchError.message}`);
      
    }
  } catch (error) {
    console.error('Error calling Tuzi AI:', error);
    throw error;
  }
}

/**
 * 根据提供商和模型调用相应的AI服务
 * @param {string} provider - AI服务提供商
 * @param {string} model - 模型ID
 * @param {string} prompt - 用户输入的提示词
 * @param {string} systemPrompt - 系统提示词
 * @param {object} options - 其他选项
 * @returns {Promise<object>} - 返回API响应
 */
export async function callAI(provider = DEFAULT_PROVIDER, model, prompt, systemPrompt, options = {}) {
  // 详细记录传入的参数
  console.log('callAI函数接收到的参数:');
  console.log('- 提供商:', provider);
  console.log('- 模型:', model);
  console.log('- 系统提示词长度:', systemPrompt?.length || 0);
  console.log('- 用户提示词长度:', prompt?.length || 0);
  console.log('- 选项:', JSON.stringify(options, null, 2));
  
  // 确保正确处理 provider 参数
  let finalProvider = provider;
  if (provider !== AI_PROVIDERS.ARK && provider !== AI_PROVIDERS.TUZI) {
    console.warn('无效的 AI 提供商:', provider, '，使用默认提供商:', DEFAULT_PROVIDER);
    finalProvider = DEFAULT_PROVIDER;
  }
  
  // 确保 model 参数有值
  let modelId;
  if (finalProvider === AI_PROVIDERS.TUZI) {
    // 如果是 Tuzi API，使用选择的模型或默认 Tuzi 模型
    modelId = model || AVAILABLE_MODELS[AI_PROVIDERS.TUZI][0].id;
  } else {
    // 如果是 ARK API，使用 ARK 的模型 ID
    modelId = model || 'ep-20250330093147-r2gkz'; // 使用传入的模型或 ARK 默认模型
  }
  
  console.log('最终使用的 AI 提供商:', finalProvider);
  console.log('最终使用的模型 ID:', modelId);
  
  // 根据提供商选择调用的 API 函数
  if (finalProvider === AI_PROVIDERS.TUZI) {
    console.log('确认调用 Tuzi API');
    return callTuziAI(prompt, systemPrompt, modelId, options);
  } else {
    console.log('确认调用 ARK API');
    return callArkAI(prompt, systemPrompt, modelId, options);
  }
}

export async function getAIResponse(prompt, systemPrompt = '你是一个有用的助手。', options = {}) {
  try {
    // 详细记录传入的选项
    console.log('=== DEBUG: getAIResponse 开始 ===');
    console.log('getAIResponse接收到的选项:', JSON.stringify(options, null, 2));
    console.log('DEFAULT_PROVIDER:', DEFAULT_PROVIDER);
    console.log('DEFAULT_MODEL:', DEFAULT_MODEL);
    
    // 确保正确获取提供商参数
    let provider = options.provider || DEFAULT_PROVIDER;
    console.log('选择的AI提供商:', provider);
    console.log('options.provider:', options.provider);
    
    // 添加一个标志，用于跟踪是否已经尝试过回退
    let hasAttemptedFallback = false;
    
    // 根据提供商选择适当的模型
    let model;
    if (provider === AI_PROVIDERS.TUZI) {
      // 如果是 Tuzi API，使用选择的模型或默认 Tuzi 模型
      model = options.model || AVAILABLE_MODELS[AI_PROVIDERS.TUZI][0].id;
      console.log('使用 Tuzi 提供商，模型 ID:', model);
    } else if (provider === AI_PROVIDERS.ARK) {
      // 如果是 ARK API，使用传入的模型或 ARK 默认模型
      model = options.model || 'ep-20250330093147-r2gkz'; // 确保使用 ARK 的模型
      console.log('使用 ARK 提供商，模型 ID:', model);
    } else {
      // 未知提供商，使用默认值
      console.warn('未知的 AI 提供商:', provider, '，使用默认提供商:', DEFAULT_PROVIDER);
      model = provider === AI_PROVIDERS.ARK ? 'ep-20250330093147-r2gkz' : DEFAULT_MODEL;
    }
    
    console.log('============= AI请求开始 =============');
    console.log(`发送请求到${provider.toUpperCase()}服务，使用模型:`, model);
    console.log('提供商:', provider);
    console.log('模型ID:', model);
    console.log('最终确认的AI提供商和模型:', { provider, model });
    console.log('模型:', model);
    console.log('系统提示词长度:', systemPrompt.length);
    console.log('用户提示词长度:', prompt.length);
    console.log('用户提示词前100字:', prompt.substring(0, 100));
    
    let response;
    try {
      // 确保model参数有效
      if (!model || model.trim() === '') {
        model = provider === AI_PROVIDERS.ARK ? DEFAULT_MODEL : AVAILABLE_MODELS[AI_PROVIDERS.TUZI][0].id;
        console.log('模型参数为空，使用默认模型:', model);
      }
      
      // 确保正确传递provider和model参数
      const aiOptions = { ...options, provider, model };
      console.log('调用AI服务的最终选项:', JSON.stringify(aiOptions, null, 2));
      
      try {
        // 尝试调用选择的 AI 提供商
        response = await callAI(provider, model, prompt, systemPrompt, aiOptions);
        console.log('AI服务原始响应:', JSON.stringify(response).substring(0, 200) + '...');
      } catch (primaryError) {
        // 如果是 Tuzi API 失败，尝试回退到 ARK API
        if (provider === AI_PROVIDERS.TUZI && !hasAttemptedFallback) {
          console.warn(`Tuzi API 调用失败: ${primaryError.message}，尝试回退到 ARK API`);
          hasAttemptedFallback = true;
          
          // 切换到 ARK API
          const fallbackProvider = AI_PROVIDERS.ARK;
          const fallbackModel = 'ep-20250330093147-r2gkz'; // ARK 默认模型
          
          console.log('回退到 ARK API，模型:', fallbackModel);
          
          // 使用 ARK API 重新尝试
          const fallbackOptions = { ...options, provider: fallbackProvider, model: fallbackModel };
          response = await callAI(fallbackProvider, fallbackModel, prompt, systemPrompt, fallbackOptions);
          console.log('ARK API 回退响应:', JSON.stringify(response).substring(0, 200) + '...');
        } else {
          // 如果不是 Tuzi API 或者已经尝试过回退，直接抛出错误
          console.error('调用AI服务失败:', primaryError);
          throw new Error(`调用${provider.toUpperCase()}服务失败: ${primaryError.message}`);
        }
      }
    } catch (callError) {
      console.error('所有AI服务调用失败:', callError);
      throw new Error(`调用AI服务失败: ${callError.message}`);
    }
    
    console.log('AI服务响应状态:', response.choices ? '成功' : '失败');
    
    if (response.choices && response.choices.length > 0) {
      let content;
      try {
        content = getAIResponseContent(response);
        console.log('AI响应内容长度:', content.length);
        console.log('AI响应内容前100字:', content.substring(0, 100));
        console.log('============= AI请求结束 =============');
        return content;
      } catch (contentError) {
        console.error('解析AI响应内容失败:', contentError);
        throw new Error(`解析${provider.toUpperCase()}响应内容失败: ${contentError.message}`);
      }
    } else {
      console.error('AI响应格式不正确:', JSON.stringify(response));
      throw new Error(`${provider.toUpperCase()}响应格式不正确`);
    }
  } catch (error) {
    console.error('获取AI响应时出错:', error);
    throw error;
  }
}
