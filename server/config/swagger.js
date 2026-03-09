/**
 * Swagger API 文档配置
 */

const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger 配置
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '黄氏家族寻根平台 API',
      version: '3.3.0',
      description: `
        基于阿里云百炼 Coding Plan 套餐的家族寻根平台 API 服务
        
        ## 功能特性
        - 🤖 AI 对话服务（支持多模型）
        - 💬 多轮对话与会话管理
        - 🔐 安全认证（JWT + API Key）
        - 📊 性能监控与统计
        - ⚡ Redis 缓存加速
        - 🛡️ 速率限制与安全防护
        
        ## 认证方式
        本API支持两种认证方式：
        1. **API Key**: 在请求头中添加 \`X-API-Key\`
        2. **JWT Token**: 在请求头中添加 \`Authorization: Bearer <token>\`
        
        ## 速率限制
        - 普通接口：每分钟最多 30 次请求
        - 聊天接口：每分钟最多 10 次请求
        - 窗口期：60 秒
      `,
      contact: {
        name: 'Huangshi Genealogy Project',
        url: 'https://hxfund.cn',
        email: 'contact@hxfund.cn'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器'
      },
      {
        url: 'https://api.hxfund.cn',
        description: '生产服务器'
      }
    ],
    components: {
      securitySchemes: {
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key 认证'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token 认证'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: '错误信息'
            },
            code: {
              type: 'string',
              description: '错误码'
            }
          }
        },
        Message: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['user', 'assistant'],
              description: '消息角色'
            },
            content: {
              type: 'string',
              description: '消息内容'
            }
          }
        },
        ChatRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: {
              type: 'string',
              description: '用户问题',
              minLength: 1,
              maxLength: 5000
            },
            model: {
              type: 'string',
              description: '模型ID',
              default: 'qwen3.5-plus',
              enum: ['qwen3.5-plus', 'qwen3-max-2026-01-23', 'qwen3-coder-next', 'qwen3-coder-plus', 'glm-5', 'glm-4.7', 'kimi-k2.5']
            },
            temperature: {
              type: 'number',
              description: '温度参数（0-2）',
              minimum: 0,
              maximum: 2,
              default: 0.7
            }
          }
        },
        ChatResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            response: {
              type: 'string',
              description: 'AI 响应内容'
            },
            model: {
              type: 'string',
              description: '使用的模型'
            },
            usage: {
              type: 'object',
              description: '使用情况统计'
            },
            responseTime: {
              type: 'number',
              description: '响应时间（毫秒）'
            },
            source: {
              type: 'string',
              example: 'qwen-code-cli'
            }
          }
        },
        Model: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '模型ID'
            },
            name: {
              type: 'string',
              description: '模型名称'
            },
            description: {
              type: 'string',
              description: '模型描述'
            },
            default: {
              type: 'boolean',
              description: '是否为默认模型'
            }
          }
        }
      }
    }
  },
  apis: [
    './server/controllers/*.js',
    './server/routes/*.js',
    './server/index.js'
  ],
  explorer: true
};

/**
 * 生成 Swagger 文档
 */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
