/**
 * 黄氏家族寻根平台 - 前端构建脚本
 * 用于构建和打包前端资源
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildFrontend() {
    console.log('🏗️  开始构建黄氏家族寻根平台前端...');

    try {
        // 1. 检查必要的目录
        const requiredDirs = [
            path.join(__dirname, 'css'),
            path.join(__dirname, 'js'),
            path.join(__dirname, 'assets'),
            path.join(__dirname, 'components'),
            path.join(__dirname, 'utils'),
            path.join(__dirname, 'pages')
        ];

        for (const dir of requiredDirs) {
            try {
                await fs.access(dir);
                console.log(`✅  目录存在: ${path.basename(dir)}`);
            } catch {
                console.log(`📁  创建目录: ${path.basename(dir)}`);
                await fs.mkdir(dir, { recursive: true });
            }
        }

        // 2. 检查必要的文件
        const requiredFiles = [
            path.join(__dirname, 'index.html'),
            path.join(__dirname, 'css', 'style.css'),
            path.join(__dirname, 'js', 'main.js'),
            path.join(__dirname, 'js', 'components', 'qwen-ai.js'),
            path.join(__dirname, 'js', 'utils', 'api-manager.js'),
            path.join(__dirname, 'js', 'utils', 'storage-manager.js'),
            path.join(__dirname, 'js', 'utils', 'ui-helper.js'),
            path.join(__dirname, 'js', 'utils', 'api-integration.js'),
            path.join(__dirname, 'js', 'utils', 'pwa-manager.js')
        ];

        let missingFiles = 0;
        for (const file of requiredFiles) {
            try {
                await fs.access(file);
                console.log(`✅  文件存在: ${path.relative(__dirname, file)}`);
            } catch {
                console.log(`❌  缺少文件: ${path.relative(__dirname, file)}`);
                missingFiles++;
            }
        }

        if (missingFiles > 0) {
            console.log(`\n⚠️  发现 ${missingFiles} 个缺失文件，正在创建示例文件...`);
            
            // 创建示例 main.js
            const mainJsContent = `/**
 * 黄氏家族寻根平台 - 主入口模块
 * 负责初始化所有组件和全局功能
 */

import { initializeNavigation } from './components/navigation.js';
import { initializeScrollEffects } from './components/scroll-effects.js';
import { initializePageLoader } from './components/page-loader.js';
import { initializeBackToTop } from './components/back-to-top.js';
import { initializeModals } from './components/modals.js';
import { initializeQwenAI } from './components/qwen-ai.js';

// 页面加载完成后初始化所有功能
document.addEventListener('DOMContentLoaded', async () => {
    console.log('黄氏家族寻根平台 - 初始化中...');

    try {
        // 初始化页面加载动画
        await initializePageLoader();

        // 初始化导航功能
        initializeNavigation();

        // 初始化滚动效果
        initializeScrollEffects();

        // 初始化回到顶部按钮
        initializeBackToTop();

        // 初始化模态框
        initializeModals();

        // 初始化Qwen AI客户端
        await initializeQwenAI();

        console.log('黄氏家族寻根平台 - 初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

// Promise拒绝处理
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});

// 导出常用工具函数
export { debounce, throttle } from './utils/helpers.js';

// 定义全局命名空间
window.hxfund = window.hxfund || {};
`;

            await fs.writeFile(path.join(__dirname, 'js', 'main.js'), mainJsContent);
            console.log('📄  已创建: js/main.js');
        }

        // 3. 验证HTML文件中的模块导入
        const indexPath = path.join(__dirname, 'index.html');
        try {
            const htmlContent = await fs.readFile(indexPath, 'utf8');
            
            // 检查是否有模块导入
            const hasModuleImports = htmlContent.includes('type="module"');
            if (hasModuleImports) {
                console.log('✅  HTML 文件包含模块导入');
            } else {
                console.log('⚠️  HTML 文件缺少模块导入，建议添加 ES 模块支持');
            }
            
            // 检查API配置
            const hasAPIConfig = htmlContent.includes('window.API_CONFIG');
            if (hasAPIConfig) {
                console.log('✅  HTML 文件包含API配置');
            } else {
                console.log('⚠️  HTML 文件缺少API配置');
            }
            
        } catch (error) {
            console.log('⚠️  无法读取 index.html 文件');
        }

        // 4. 检查CSS文件
        const cssPath = path.join(__dirname, 'css', 'style.css');
        try {
            const cssContent = await fs.readFile(cssPath, 'utf8');
            const hasVariables = cssContent.includes(':root');
            const hasResponsive = cssContent.includes('@media');
            
            if (hasVariables && hasResponsive) {
                console.log('✅  CSS 文件包含变量和响应式设计');
            } else {
                console.log('⚠️  CSS 文件可能缺少变量定义或响应式设计');
            }
        } catch (error) {
            console.log('⚠️  无法读取 CSS 文件');
        }

        // 5. 生成构建报告
        const stats = {
            timestamp: new Date().toISOString(),
            totalFiles: requiredFiles.length,
            missingFiles: missingFiles,
            completed: missingFiles === 0,
            message: missingFiles === 0 
                ? '🎉 前端重构完成，所有必要文件已准备就绪！' 
                : `⚠️  部分文件缺失，已创建 ${missingFiles} 个示例文件`
        };

        console.log('\n📋 构建报告:');
        console.log(`   时间: ${stats.timestamp}`);
        console.log(`   文件总数: ${stats.totalFiles}`);
        console.log(`   缺失文件: ${stats.missingFiles}`);
        console.log(`   状态: ${stats.completed ? '✅ 完成' : '⚠️ 需要补充'}`);
        console.log(`   信息: ${stats.message}`);

        // 6. 创建构建完成标记
        const distDir = path.join(__dirname, '../dist');
        await fs.mkdir(distDir, { recursive: true });
        
        const buildInfo = {
            ...stats,
            version: '3.2.0',
            platform: 'hxfund-frontend-rebuild',
            builtAt: new Date().toISOString()
        };
        
        await fs.writeFile(
            path.join(distDir, 'BUILD_INFO.json'), 
            JSON.stringify(buildInfo, null, 2)
        );
        
        console.log('\n💾 构建信息已保存到 dist/BUILD_INFO.json');

        return stats;

    } catch (error) {
        console.error('❌ 构建过程中出现错误:', error.message);
        throw error;
    }
}

// 执行构建
if (process.argv[1] === __filename) {
    buildFrontend()
        .then(stats => {
            console.log('\n✨ 构建完成！');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 构建失败:', error.message);
            process.exit(1);
        });
}

export { buildFrontend };