#!/bin/bash

# 黄氏家族寻根平台 - API密钥配置脚本

echo "==========================================="
echo "黄氏家族寻根平台 - API密钥配置"
echo "==========================================="

echo
echo "当前配置:"
CURRENT_CONFIG_FILE="$HOME/.qwen-code/config.json"
if [ -f "$CURRENT_CONFIG_FILE" ]; then
    echo "  - CLI配置文件: $CURRENT_CONFIG_FILE"
    echo "  - 当前模型: $(grep -o '"model":"[^"]*"' $CURRENT_CONFIG_FILE | cut -d'"' -f4)"
    echo "  - 当前API Key前缀: $(grep -o '"apiKey":"[^"]*"' $CURRENT_CONFIG_FILE | cut -d'"' -f4 | cut -c1-8)..."
else
    echo "  - 未找到配置文件，将创建新配置"
fi

echo
echo "重要提醒:"
echo "1. 您需要阿里云百炼平台的Coding Plan API Key"
echo "2. API Key格式应为: sk-sp-xxxxxxxxxxxxxxxx"
echo "3. 请确保API Key有足够的调用额度"
echo

read -p "是否要配置新的API密钥? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "配置已取消"
    exit 0
fi

echo
read -p "请输入您的API Key (sk-sp-开头): " API_KEY

# 验证API Key格式
if [[ ! "$API_KEY" =~ ^sk-sp- ]]; then
    echo "错误: API Key格式不正确，应以sk-sp-开头"
    exit 1
fi

# 创建配置目录
CONFIG_DIR="$HOME/.qwen-code"
mkdir -p "$CONFIG_DIR"

# 创建配置文件
cat > "$CURRENT_CONFIG_FILE" << EOF
{
  "apiKey": "$API_KEY",
  "baseURL": "https://coding.dashscope.aliyuncs.com/v1",
  "model": "qwen3.5-plus",
  "temperature": 0.7,
  "systemPrompt": "你是黄氏家族寻根助手，由通义千问提供技术支持。你专注于：\\n1. 解答黄姓起源、历史和文化\\n2. 帮助查询族谱和字辈信息\\n3. 提供寻根问祖相关咨询\\n4. 传承和弘扬黄氏家族传统美德\\n\\n作为编程助手，你也擅长解答代码相关问题。"
}
EOF

echo
echo "API密钥配置完成!"
echo "配置文件已保存到: $CURRENT_CONFIG_FILE"
echo
echo "接下来您可以:"
echo "1. 启动后端服务: npm start"
echo "2. 测试API连接: curl http://localhost:3000/api/health"
echo "3. 检查服务状态: 访问 http://localhost:3000/api/docs"
echo

# 测试API密钥是否有效
echo "测试API密钥配置..."
TEST_RESPONSE=$(cd /root/hxfund && timeout 10 node -e "
const fs = require('fs');
const path = require('path');
const configPath = path.join(require('os').homedir(), '.qwen-code', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

if (config.apiKey && config.apiKey.startsWith('sk-sp-')) {
  console.log('✓ API密钥格式正确');
  console.log('✓ 配置验证通过');
} else {
  console.log('✗ API密钥格式不正确');
}
")

echo "$TEST_RESPONSE"
echo
echo "==========================================="
echo "配置完成!"
echo "==========================================="