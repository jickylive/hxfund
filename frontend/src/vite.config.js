/**
 * 黄氏家族寻根平台 - Vite 构建配置
 */

// 动态导入插件以避免顶层await问题
async function getPlugins() {
  const plugins = [];
  
  // 包体积分析 - 仅在ANALYZE环境变量设置时启用
  if (process.env.ANALYZE) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    }));
  }
  
  return plugins;
}

// 导出配置函数，这样可以异步获取插件
export default async () => {
  return {
    root: '.', // 项目根目录
    base: './', // 相对路径部署
    publicDir: 'assets', // 静态资源目录
    server: {
      host: true,
      port: 3001,
      https: false, // 开发环境下不使用HTTPS
      open: false, // 不自动打开浏览器
      proxy: {
        // 开发环境下代理API请求
        '/api': {
          target: 'http://localhost:3000', // 本地后端服务
          changeOrigin: true,
          secure: false
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
          drop_console: false, // 开发时保留console
          drop_debugger: false // 开发时保留debugger
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
    plugins: await getPlugins(),
    css: {
      modules: {
        localsConvention: 'camelCase' // CSS Modules 局部变量命名规范
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
  };
};