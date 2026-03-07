/**
 * 黄氏家族寻根平台 - PM2 生态系统配置
 */

module.exports = {
  apps: [{
    name: 'huangshi-genealogy-api',
    script: './server/index.js',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster', // 集群模式
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      API_KEY: process.env.API_KEY || '',
      BASE_URL: process.env.BASE_URL || 'http://localhost:3000'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      API_KEY: process.env.API_KEY || '',
      BASE_URL: process.env.BASE_URL || 'https://api.hxfund.cn'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    restart_delay: 30000, // 30秒后重启
    node_args: '--max-old-space-size=1024', // 限制内存使用
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }, {
    name: 'huangshi-genealogy-frontend',
    script: 'npx',
    args: 'vite --host --port 3001',
    cwd: './frontend/src',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/fe-err.log',
    out_file: './logs/fe-out.log',
    log_file: './logs/fe-combined.log',
    time: true
  }],
  
  deploy: {
    production: {
      user: 'root',
      host: process.env.PROD_HOST || 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/huangshi-genealogy/hxfund.cn.git',
      path: '/opt/hxfund',
      'pre-deploy': 'npm install',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};