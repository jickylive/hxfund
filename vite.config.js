/**
 * 黄氏家族寻根平台 - 构建配置
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  root: 'frontend/src', // 项目根目录
  base: './', // 相对路径部署
  publicDir: 'assets', // 静态资源目录
  
  server: {
    host: true,
    port: 3001,
    https: false, // 开发环境下不使用HTTPS
    open: false, // 不自动打开浏览器
    proxy: {
      // 开发环境下代理API请求到后端
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  build: {
    outDir: '../dist', // 输出到父级dist目录
    assetsDir: 'assets', // 静态资源目录
    sourcemap: true, // 生成源映射
    minify: 'terser', // 使用terser压缩
    terserOptions: {
      compress: {
        drop_console: true, // 移除console
        drop_debugger: true // 移除debugger
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'frontend/src/index.html'), // 主入口
        qwen: resolve(__dirname, 'frontend/src/qwen-ai/index.html') // Qwen AI入口
      },
      output: {
        entryFileNames: 'js/[name].[hash].js', // 入口文件命名
        chunkFileNames: 'js/[name].[hash].js', // 代码块命名
        assetFileNames: (assetInfo) => {
          // 静态资源分类存放
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name].[hash].[ext]';
          }
          if (assetInfo.name.match(/\.(png|jpe?g|gif|svg|webp)$/)) {
            return 'images/[name].[hash].[ext]';
          }
          if (assetInfo.name.match(/\.(woff2?|eot|ttf|otf)$/)) {
            return 'fonts/[name].[hash].[ext]';
          }
          return 'assets/[name].[hash].[ext]';
        }
      }
    },
    manifest: true, // 生成资源清单
    ssrManifest: false, // 不生成SSR清单
    cssCodeSplit: true // CSS代码分割
  },
  
  plugins: [
    // 开发环境下使用SSL
    basicSsl(),
    // 包体积分析 - 仅在ANALYZE环境变量设置时启用
    process.env.ANALYZE && visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean), // 过滤掉false值
  
  css: {
    modules: {
      localsConvention: 'camelCase' // CSS Modules 局部变量命名规范
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";` // 全局SCSS变量
      }
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend/src'), // @ 符号指向 src 目录
      '@components': resolve(__dirname, 'frontend/src/components'),
      '@utils': resolve(__dirname, 'frontend/src/utils'),
      '@assets': resolve(__dirname, 'frontend/src/assets'),
      '@api': resolve(__dirname, 'frontend/src/api'),
      '@pages': resolve(__dirname, 'frontend/src/pages'),
      '@styles': resolve(__dirname, 'frontend/src/styles')
    }
  },
  
  optimizeDeps: {
    include: [
      // 预构建依赖
      'qwen-ai-sdk'
    ]
  }
});