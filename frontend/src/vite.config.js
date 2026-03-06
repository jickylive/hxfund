/**
 * 黄氏家族寻根平台 - Vite 构建配置
 */

import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  root: '.', // 项目根目录
  base: './', // 相对路径部署
  publicDir: 'assets', // 静态资源目录
  server: {
    host: true,
    port: 3000,
    https: false, // 开发环境下不使用HTTPS
    open: true, // 自动打开浏览器
    proxy: {
      // 开发环境下代理API请求
      '/api': {
        target: 'https://api.hxfund.cn',
        changeOrigin: true,
        secure: true
      }
    }
  },
  build: {
    outDir: '../dist', // 输出目录
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
        main: './index.html', // 主入口
      },
      output: {
        entryFileNames: 'js/[name].[hash].js', // 入口文件命名
        chunkFileNames: 'js/[name].[hash].js', // 代码块命名
        assetFileNames: (assetInfo) => {
          // 静态资源分类存放
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name].[hash].[ext]';
          }
          if (assetInfo.name.match(/\.(png|jpe?g|gif|svg)$/)) {
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
    // 包体积分析
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
      '@': '/src', // @ 符号指向 src 目录
      '@components': '/src/components',
      '@utils': '/src/utils',
      '@assets': '/src/assets'
    }
  },
  optimizeDeps: {
    include: [
      // 预构建依赖
    ]
  }
});