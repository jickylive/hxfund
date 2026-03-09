# API密钥配置指南

## 配置阿里云百炼Coding Plan API密钥

要使Qwen AI客户端的对话功能正常工作，您需要配置有效的API密钥：

### 1. 获取API密钥
1. 访问阿里云百炼平台：https://bailian.console.aliyun.com/cn-beijing/?tab=service#/coding-plan
2. 注册并开通Coding Plan套餐
3. 获取API密钥（格式为 `sk-sp-xxxxx`）

### 2. 配置API密钥到后端服务

#### 方法一：通过容器内部配置
```bash
# 进入API容器
docker exec -it huangshi-api /bin/sh

# 运行初始化向导
node qwen-code.js --init

# 按照向导提示输入API密钥和选择模型
```

#### 方法二：直接创建配置文件
```bash
# 在容器中创建配置目录
mkdir -p /home/nodejs/.qwen-code

# 创建配置文件
cat > /home/nodejs/.qwen-code/config.json << EOF
{
  "apiKey": "YOUR_ACTUAL_API_KEY_HERE",
  "baseURL": "https://coding.dashscope.aliyuncs.com/v1",
  "model": "qwen3.5-plus",
  "temperature": 0.7,
  "systemPrompt": "你是黄氏家族寻根助手，由通义千问提供技术支持。你专注于：\n1. 解答黄姓起源、历史和文化\n2. 帮助查询族谱和字辈信息\n3. 提供寻根问祖相关咨询\n4. 传承和弘扬黄氏家族传统美德\n\n作为编程助手，你也擅长解答代码相关问题。"
}
EOF
```

### 3. 重启服务
```bash
cd /root/hxfund
docker-compose restart api
```

### 4. 验证配置
配置完成后，可以测试对话功能：
```bash
# 获取认证token
curl -X POST https://api.hxfund.cn/api/auth/client-token \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.hxfund.cn" \
  -d '{}'

# 使用获得的token测试对话API
curl -X POST https://api.hxfund.cn/api/conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Origin: https://www.hxfund.cn" \
  -d '{"message":"你好", "model":"qwen3.5-plus", "temperature":0.7}'
```

### 5. 前端测试
配置完成后，前端Qwen AI客户端应该能够：
- 成功获取认证令牌
- 正确加载模型列表
- 与AI模型进行实际对话
- 显示AI的回复

### 注意事项
- API密钥是敏感信息，请妥善保管
- Coding Plan有使用配额限制，请合理使用
- 如果API密钥配置错误，服务会返回相应的错误信息
- 请确保选择的模型在Coding Plan套餐支持范围内