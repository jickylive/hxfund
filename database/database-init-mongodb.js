/**
 * 黄氏家族寻根平台 - MongoDB 数据库初始化脚本
 * 基于 public/js/data.js 数据建模
 * 
 * 使用方式:
 *   mongosh < database-init.js
 * 或
 *   mongo < database-init.js
 */

// 切换数据库
use hxfund_db;

// ============================================
// 1. 创建集合 (Collections)
// ============================================

// 家族成员集合
db.createCollection("family_members", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "title", "name"],
      properties: {
        id: { bsonType: "string", description: "成员 ID" },
        parent_id: { bsonType: "string", description: "父成员 ID" },
        name: { bsonType: "string", description: "分支/支系名称" },
        title: { bsonType: "string", description: "人物称号/姓名" },
        period: { bsonType: "string", description: "历史时期" },
        avatar: { bsonType: "string", description: "头像 emoji" },
        bio: { bsonType: "string", description: "人物简介" },
        location: { bsonType: "string", description: "地理位置" },
        level: { bsonType: "int", description: "树层级" },
        children: { bsonType: "array", description: "子成员数组" }
      }
    }
  }
});

// 字辈集合
db.createCollection("generation_poems", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["branch_code", "branch_name", "poem", "characters"],
      properties: {
        branch_code: { bsonType: "string" },
        branch_name: { bsonType: "string" },
        poem: { bsonType: "string" },
        characters: { bsonType: "string" }
      }
    }
  }
});

// 项目幻灯片集合
db.createCollection("project_slides", {});

// 区块链存证集合
db.createCollection("blockchain_records", {});

// 留言集合
db.createCollection("guest_messages", {});

// 用户集合
db.createCollection("users", {});

// 会话集合
db.createCollection("sessions", { capped: false });

// AI 对话记录集合
db.createCollection("ai_conversations", {});

// 系统配置集合
db.createCollection("system_config", {});

// ============================================
// 2. 创建索引
// ============================================

// 家族成员索引
db.family_members.createIndex({ "id": 1 }, { unique: true });
db.family_members.createIndex({ "parent_id": 1 });
db.family_members.createIndex({ "level": 1 });
db.family_members.createIndex({ "title": "text", "bio": "text" });

// 字辈索引
db.generation_poems.createIndex({ "branch_code": 1 }, { unique: true });

// 区块链存证索引
db.blockchain_records.createIndex({ "record_id": 1 }, { unique: true });
db.blockchain_records.createIndex({ "hash_value": 1 });

// 用户索引
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

// 会话索引
db.sessions.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });

// AI 对话索引
db.ai_conversations.createIndex({ "session_id": 1 });
db.ai_conversations.createIndex({ "created_at": -1 });

// ============================================
// 3. 插入初始数据
// ============================================

// 1. 家族成员数据
db.family_members.insertMany([
  {
    id: "ancestor",
    parent_id: null,
    name: "黄姓始祖",
    title: "伯益",
    period: "上古时期",
    avatar: "👤",
    bio: "黄姓得姓始祖",
    location: "中原地区",
    level: 0,
    children: ["branch-1", "branch-2", "branch-3"]
  },
  {
    id: "branch-1",
    parent_id: "ancestor",
    name: "江夏黄氏",
    title: "黄香",
    period: "东汉",
    avatar: "📚",
    bio: "江夏黄氏代表人物，二十四孝之一",
    location: "湖北江夏",
    level: 1,
    children: ["gen-1-1", "gen-1-2"]
  },
  {
    id: "branch-2",
    parent_id: "ancestor",
    name: "金华黄氏",
    title: "黄岸",
    period: "唐代",
    avatar: "📖",
    bio: "唐代进士，金华黄氏始祖",
    location: "浙江金华",
    level: 1,
    children: ["gen-2-1"]
  },
  {
    id: "branch-3",
    parent_id: "ancestor",
    name: "闽台黄氏",
    title: "黄敦",
    period: "唐代",
    avatar: "🏮",
    bio: "唐代入闽始祖",
    location: "福建",
    level: 1,
    children: ["gen-3-1"]
  },
  {
    id: "gen-1-1",
    parent_id: "branch-1",
    name: "江夏支系",
    title: "黄琼",
    period: "东汉",
    avatar: "🏛️",
    bio: "东汉名臣，官至太尉",
    location: "湖北江夏",
    level: 2,
    children: []
  },
  {
    id: "gen-1-2",
    parent_id: "branch-1",
    name: "江夏支系",
    title: "黄琬",
    period: "东汉末年",
    avatar: "🎭",
    bio: "东汉末年大臣",
    location: "湖北江夏",
    level: 2,
    children: []
  },
  {
    id: "gen-2-1",
    parent_id: "branch-2",
    name: "金华支系",
    title: "黄峭",
    period: "五代十国",
    avatar: "🌾",
    bio: "五代名臣，创办义门",
    location: "福建邵武",
    level: 2,
    children: ["gen-2-1-1"]
  },
  {
    id: "gen-2-1-1",
    parent_id: "gen-2-1",
    name: "邵武黄氏",
    title: "黄维",
    period: "宋代",
    avatar: "✍️",
    bio: "宋代文人",
    location: "福建邵武",
    level: 3,
    children: []
  },
  {
    id: "gen-3-1",
    parent_id: "branch-3",
    name: "闽台支系",
    title: "黄彦斌",
    period: "明代",
    avatar: "⚓",
    bio: "明代航海家",
    location: "福建泉州",
    level: 2,
    children: []
  }
]);

// 2. 字辈数据
db.generation_poems.insertMany([
  {
    branch_code: "jiangxia",
    branch_name: "江夏黄氏",
    poem: "文章华国诗礼传家忠孝为本仁义是先",
    characters: "文章华国诗礼传家忠孝为本仁义是先"
  },
  {
    branch_code: "shicheng",
    branch_name: "石城黄氏",
    poem: "祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光",
    characters: "祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光"
  },
  {
    branch_code: "mianyang",
    branch_name: "绵阳黄氏",
    poem: "朝廷文仕正世代永兴隆",
    characters: "朝廷文仕正世代永兴隆"
  },
  {
    branch_code: "fujian",
    branch_name: "福建黄氏",
    poem: "敦厚垂型远诗书世泽长",
    characters: "敦厚垂型远诗书世泽长"
  }
]);

// 3. 项目幻灯片数据
db.project_slides.insertMany([
  {
    title: "愿景使命",
    subtitle: "数字化传承黄氏家族文化，连接全球宗亲",
    content: "打造全球黄氏宗亲的数字化精神家园，让千年血脉在数字时代继续传承。通过现代科技手段，保护和弘扬黄氏家族的优秀传统文化。",
    icon: "🎯",
    color: "#8B4513",
    tags: ["文化传承", "数字化", "精神家园"],
    sort_order: 1,
    is_active: true
  },
  {
    title: "核心功能",
    subtitle: "六大模块全面服务宗亲",
    content: "族谱树 · 字辈计算器 · AI 助手 · 区块链存证 · 留言墙 · 项目展示",
    icon: "⚙️",
    color: "#C8933A",
    tags: ["族谱查询", "智能计算", "AI 对话", "区块链"],
    sort_order: 2,
    is_active: true
  },
  {
    title: "技术架构",
    subtitle: "现代化、可扩展的技术栈",
    content: "Node.js + Express 后端 · 原生 JavaScript 前端 · 阿里云百炼 AI · JWT 认证体系 · 速率限制保护",
    icon: "🏗️",
    color: "#c0392b",
    tags: ["Node.js", "Express", "AI", "JWT"],
    sort_order: 3,
    is_active: true
  },
  {
    title: "数据安全",
    subtitle: "区块链存证，确保数据真实可信",
    content: "采用 SHA-256 哈希上链技术，确保族谱数据不可篡改、可溯源、永久保存。每一次修改都有迹可循，守护家族历史的真实性。",
    icon: "🔗",
    color: "#27ae60",
    tags: ["SHA-256", "不可篡改", "可溯源"],
    sort_order: 4,
    is_active: true
  },
  {
    title: "未来规划",
    subtitle: "持续迭代，打造更好的服务平台",
    content: "移动端 APP 开发 · 3D 族谱可视化 · AI 族谱智能修复 · 全球宗亲地图 · 线上线下活动联动",
    icon: "🚀",
    color: "#2980b9",
    tags: ["移动端", "3D 可视化", "AI 修复", "全球地图"],
    sort_order: 5,
    is_active: true
  }
]);

// 4. 区块链存证数据
db.blockchain_records.insertMany([
  {
    record_id: "MBR-2024-001",
    member_name: "黄香",
    hash_value: "0x7a8f9c3e2d1b5a4c6e8f0a2b4d6e8f0a2b4d6e8f",
    is_verified: true,
    verified_at: new Date()
  },
  {
    record_id: "MBR-2024-002",
    member_name: "黄峭",
    hash_value: "0x3b5d7f9a1c3e5g7i9k1m3o5q7s9u1w3y5a7c9e1g",
    is_verified: true,
    verified_at: new Date()
  },
  {
    record_id: "MBR-2024-003",
    member_name: "黄岸",
    hash_value: "0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d",
    is_verified: true,
    verified_at: new Date()
  }
]);

// 5. 留言数据
db.guest_messages.insertMany([
  {
    user_name: "黄志强",
    content: "寻找湖南宁乡黄氏宗亲，字辈为\"光明正大\"，望联系。",
    location: "湖南长沙",
    is_public: true,
    is_verified: true,
    created_at: new Date()
  },
  {
    user_name: "黄文华",
    content: "感谢平台让我们这些海外游子能够了解家族历史！",
    location: "美国旧金山",
    is_public: true,
    is_verified: true,
    created_at: new Date()
  },
  {
    user_name: "匿名宗亲",
    content: "福建邵武黄氏后裔，希望能找到同支系的宗亲。",
    location: "台湾台北",
    is_public: true,
    is_verified: true,
    created_at: new Date()
  }
]);

// 6. 系统配置数据
db.system_config.insertMany([
  {
    config_key: "site_name",
    config_value: "黄氏家族寻根平台",
    config_type: "string",
    description: "网站名称",
    is_public: true
  },
  {
    config_key: "site_version",
    config_value: "3.2.0",
    config_type: "string",
    description: "系统版本号",
    is_public: true
  },
  {
    config_key: "allowed_origins",
    config_value: ["https://hxfund.cn", "https://www.hxfund.cn"],
    config_type: "json",
    description: "CORS 允许的源",
    is_public: false
  },
  {
    config_key: "rate_limit_window_ms",
    config_value: 60000,
    config_type: "number",
    description: "速率限制窗口 (毫秒)",
    is_public: false
  },
  {
    config_key: "rate_limit_max_requests",
    config_value: 30,
    config_type: "number",
    description: "速率限制最大请求数",
    is_public: false
  },
  {
    config_key: "ai_default_model",
    config_value: "qwen3.5-plus",
    config_type: "string",
    description: "默认 AI 模型",
    is_public: false
  },
  {
    config_key: "ai_temperature",
    config_value: 0.7,
    config_type: "number",
    description: "AI 温度参数",
    is_public: false
  }
]);

// ============================================
// 4. 创建聚合查询视图 (Pipeline)
// ============================================

// 保存家族树查询管道
db.family_members_views = {
  // 获取完整家族树
  fullTree: [
    {
      $graphLookup: {
        from: "family_members",
        startWith: "$id",
        connectFromField: "id",
        connectToField: "parent_id",
        as: "descendants",
        maxDepth: 10
      }
    }
  ],
  
  // 获取某成员的祖先链
  ancestors: (memberId) => [
    { $match: { id: memberId } },
    {
      $graphLookup: {
        from: "family_members",
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "id",
        as: "ancestors",
        maxDepth: 10
      }
    }
  ]
};

// ============================================
// 5. 验证数据
// ============================================

print("\n========================================");
print("✅ MongoDB 数据库初始化完成！");
print("========================================");
print("\n数据库：hxfund_db");
print("\n集合统计:");
print("  家族成员：" + db.family_members.countDocuments({}) + " 人");
print("  字辈分支：" + db.generation_poems.countDocuments({}) + " 个");
print("  幻灯片：" + db.project_slides.countDocuments({}) + " 个");
print("  存证记录：" + db.blockchain_records.countDocuments({}) + " 条");
print("  留言：" + db.guest_messages.countDocuments({}) + " 条");
print("  系统配置：" + db.system_config.countDocuments({}) + " 项");
print("\n========================================\n");

// 示例查询
print("\n📊 家族树顶层成员:");
db.family_members.find({ level: 0 }).forEach(doc => {
  print("  - " + doc.title + " (" + doc.period + ")");
});

print("\n📜 字辈分支:");
db.generation_poems.find({}).forEach(doc => {
  print("  - " + doc.branch_name + ": " + doc.poem);
});
