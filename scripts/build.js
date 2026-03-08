/**
 * 黄氏家族寻根平台 - 构建脚本
 *
 * 功能：
 * 1. 构建 Vite 前端资源
 * 2. 复制静态资源到 dist 目录
 * 3. 使用 terser 压缩 JS 文件
 * 4. 使用 cssnano 压缩 CSS 文件
 * 5. 生成 CDN 优化版本的 HTML
 * 6. 生成资源清单
 * 7. 备份会话数据（压缩格式）
 * 8. 构建 Hexo 博客到 dist/blog 目录
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

// Dynamically require terser only when needed
let terser = null;
async function getTerser() {
    if (!terser) {
        terser = await import('terser');
    }
    return terser;
}

const SRC_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// 创建目录
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 复制文件
function copyFile(src, dest) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${path.relative(SRC_DIR, dest)}`);
}

// 复制目录
function copyDir(src, dest, filter = null) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (filter && !filter(entry.name)) continue;
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath, filter);
        } else {
            copyFile(srcPath, destPath);
        }
    }
}

// 简单压缩 CSS（移除注释和多余空白）
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')  // 移除注释
        .replace(/\s+/g, ' ')              // 多余空白变单空格
        .replace(/\s*([{}:;,])\s*/g, '$1') // 移除符号周围空格
        .replace(/\n/g, '')                // 移除换行
        .trim();
}

// 简单压缩 JS（移除注释）
function minifyJS(js) {
    return js
        .replace(/\/\*[\s\S]*?\*\//g, '')  // 移除块注释
        .replace(/\/\/.*$/gm, '')          // 移除行注释
        .trim();
}

// 处理 CSS 文件
function processCSS() {
    console.log('\n📄 处理 CSS 文件...');
    const cssSrc = path.join(PUBLIC_DIR, 'css', 'style.css');
    const cssDest = path.join(DIST_DIR, 'css', 'style.css');
    const cssMinDest = path.join(DIST_DIR, 'css', 'style.min.css');
    
    const css = fs.readFileSync(cssSrc, 'utf-8');
    
    // 复制原始文件
    fs.writeFileSync(cssDest, css, 'utf-8');
    console.log(`  ✓ css/style.css`);
    
    // 生成压缩版本
    const minified = minifyCSS(css);
    fs.writeFileSync(cssMinDest, minified, 'utf-8');
    console.log(`  ✓ css/style.min.css (${(minified.length / 1024).toFixed(2)} KB)`);
    
    return {
        original: css.length,
        minified: minified.length,
        savings: ((1 - minified.length / css.length) * 100).toFixed(1)
    };
}

// 压缩 JS（使用 terser）
async function processJS() {
    console.log('\n📄 处理 JS 文件...');
    const jsFiles = ['data.js', 'main.js', 'modules.js', 'script.js'];
    const stats = [];

    for (const file of jsFiles) {
        const src = path.join(PUBLIC_DIR, 'js', file);
        const dest = path.join(DIST_DIR, 'js', file);
        const minDest = path.join(DIST_DIR, 'js', file.replace('.js', '.min.js'));

        if (!fs.existsSync(src)) continue;

        const js = fs.readFileSync(src, 'utf-8');

        // 复制原始文件
        fs.writeFileSync(dest, js, 'utf-8');
        console.log(`  ✓ js/${file}`);

        // 使用 terser 生成压缩版本
        try {
            const terserModule = await getTerser();
            const minified = await terserModule.minify(js, {
                compress: {
                    drop_console: false,
                    drop_debugger: false,
                    pure_funcs: []
                },
                mangle: {
                    reserved: ['familyTreeData', 'generationPoems', 'pptSlides', 'bcRecords', 'guestMessages']
                },
                output: {
                    comments: false
                }
            });

            fs.writeFileSync(minDest, minified.code, 'utf-8');
            console.log(`  ✓ js/${file.replace('.js', '.min.js')} (${(minified.code.length / 1024).toFixed(2)} KB)`);

            stats.push({
                file,
                original: js.length,
                minified: minified.code.length,
                savings: ((1 - minified.code.length / js.length) * 100).toFixed(1)
            });
        } catch (error) {
            console.error(`  ✗ 压缩失败 js/${file}: ${error.message}`);
            // 降级到简单压缩
            const simpleMinified = js
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
                .trim();
            fs.writeFileSync(minDest, simpleMinified, 'utf-8');
            stats.push({
                file,
                original: js.length,
                minified: simpleMinified.length,
                savings: ((1 - simpleMinified.length / js.length) * 100).toFixed(1)
            });
        }
    }

    return stats;
}

// 生成优化版 HTML
function generateHTML() {
    console.log('\n📄 生成优化版 HTML...');
    
    const htmlSrc = path.join(SRC_DIR, 'index.html');
    const htmlDest = path.join(DIST_DIR, 'index.html');
    
    let html = fs.readFileSync(htmlSrc, 'utf-8');
    
    // 替换为压缩版本
    html = html.replace('href="/css/style.css"', 'href="/css/style.min.css"');
    html = html.replace('src="/js/data.js"', 'src="/js/data.min.js"');
    html = html.replace('src="/js/main.js"', 'src="/js/main.min.js"');
    html = html.replace('src="/js/modules.js"', 'src="/js/modules.min.js"');
    html = html.replace('src="/js/script.js"', 'src="/js/script.min.js"');
    
    // 添加 CDN 预加载和 SEO 优化
    const preloadLinks = `
    <!-- CDN 预加载 -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- PWA 配置 -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#8B4513">
    
    <!-- SEO 优化 -->
    <meta name="keywords" content="黄氏家族，寻根，族谱，字辈，黄姓，宗亲会，家族文化">
    <meta name="author" content="黄氏家族寻根平台">
    <link rel="canonical" href="https://hxfund.cn/">
    
    <!-- 社交媒体分享优化 -->
    <meta property="og:title" content="黄氏家族寻根平台 | hxfund.cn">
    <meta property="og:description" content="数字化传承黄氏家族文化，帮助全球宗亲查询族谱、字辈与寻根问祖。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://hxfund.cn/">
    <meta name="twitter:card" content="summary_large_image">`;
    
    html = html.replace('</head>', preloadLinks + '\n</head>');
    
    fs.writeFileSync(htmlDest, html, 'utf-8');
    console.log(`  ✓ index.html`);
    
    return html.length;
}

// 生成资源清单
function generateManifest(stats) {
    console.log('\n📋 生成资源清单...');

    const manifest = {
        version: '3.1.1',
        buildTime: new Date().toISOString(),
        files: {
            css: {
                'style.css': stats.css,
                'style.min.css': { size: stats.css.minified, savings: stats.css.savings + '%' }
            },
            js: stats.js.map(s => ({
                file: s.file,
                original: s.original,
                minified: s.minified,
                savings: s.savings + '%'
            }))
        },
        totalSavings: {
            css: stats.css.savings + '%',
            js: (stats.js.reduce((sum, s) => sum + s.minified, 0) / stats.js.reduce((sum, s) => sum + s.original, 0) * 100).toFixed(1) + '%'
        }
    };

    const dest = path.join(DIST_DIR, 'manifest.json');
    fs.writeFileSync(dest, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`  ✓ manifest.json`);

    return manifest;
}

// 备份会话数据（压缩格式）
async function backupSessionData() {
    console.log('\n💾 备份会话数据...');
    
    // 创建备份目录
    const backupDir = path.join(DIST_DIR, 'backups');
    ensureDir(backupDir);
    
    try {
        // 检查是否有会话数据需要备份
        const sessionStorePath = path.join(SRC_DIR, 'server', 'session-store.js');
        if (!fs.existsSync(sessionStorePath)) {
            console.log('  ℹ️  会话存储模块不存在，跳过备份');
            return;
        }
        
        // 读取当前会话数据（如果是内存存储的话）
        // 在实际部署中，会话数据可能存储在 Redis 或其他地方
        // 这里我们创建一个示例备份
        
        const sessionBackup = {
            timestamp: new Date().toISOString(),
            note: '会话数据备份 - 仅用于演示目的，实际会话数据可能存储在 Redis 或其他持久化存储中',
            backupType: 'session-data-compression-backup'
        };
        
        // 将备份数据转换为 JSON
        const sessionData = JSON.stringify(sessionBackup, null, 2);
        
        // 压缩数据
        const compressedData = zlib.gzipSync(sessionData);
        
        // 保存压缩的备份文件
        const backupFileName = `sessions-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json.gz`;
        const backupFilePath = path.join(backupDir, backupFileName);
        
        fs.writeFileSync(backupFilePath, compressedData);
        
        console.log(`  ✓ ${path.relative(DIST_DIR, backupFilePath)} (${(compressedData.length / 1024).toFixed(2)} KB)`);
        
        // 同时保存未压缩的备份作为参考
        const uncompressedBackupPath = path.join(backupDir, backupFileName.replace('.gz', '.json'));
        fs.writeFileSync(uncompressedBackupPath, sessionData);
        
        console.log(`  ✓ ${path.relative(DIST_DIR, uncompressedBackupPath)} (${(sessionData.length / 1024).toFixed(2)} KB)`);
        
    } catch (error) {
        console.error(`  ✗ 会话数据备份失败: ${error.message}`);
    }
}

// 构建 Vite 前端
async function buildFrontend() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     构建 Vite 前端 (frontend/src)                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'src');
    const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

    if (!fs.existsSync(path.join(FRONTEND_DIR, 'package.json'))) {
        console.log('  ℹ️  frontend/src 目录不存在，跳过前端构建');
        return;
    }

    try {
        console.log('🔨 安装前端依赖...');
        execSync('npm install', {
            cwd: FRONTEND_DIR,
            stdio: 'inherit'
        });

        console.log('🔨 构建 Vite 前端...');
        execSync('npm run build', {
            cwd: FRONTEND_DIR,
            stdio: 'inherit'
        });

        console.log('✅ 前端构建完成');

        // 复制前端构建产物到 dist/
        if (fs.existsSync(frontendDist)) {
            console.log('📁 复制前端构建产物到 dist/...');
            copyDir(frontendDist, path.join(__dirname, '..', 'dist'));
        }

    } catch (error) {
        console.error('❌ 前端构建失败:', error.message);
        console.log('⚠️  继续构建其他部分...');
    }
}

// 构建 Hexo 博客
async function buildBlog() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     构建 Hexo 博客 (dist/blog)                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const BLOG_DIR = path.join(__dirname, '..', 'blog');
    const blogBuildScript = path.join(BLOG_DIR, 'build-to-dist.js');

    if (!fs.existsSync(blogBuildScript)) {
        console.log('  ℹ️  博客构建脚本不存在，跳过博客构建');
        return;
    }

    try {
        console.log('🔨 构建 Hexo 博客...');
        execSync(`node "${blogBuildScript}"`, {
            cwd: BLOG_DIR,
            stdio: 'inherit'
        });
        console.log('✅ 博客构建完成');
    } catch (error) {
        console.error('❌ 博客构建失败:', error.message);
        console.log('⚠️  继续主项目构建...');
    }
}

// 主函数
async function build() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     黄氏家族寻根平台 - 静态资源构建                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // 定义目录路径
    const DIST_DIR = path.join(__dirname, '..', 'dist');
    const PUBLIC_DIR = path.join(__dirname, '..', 'public');

    // 清理并创建目录
    console.log('📁 创建目录结构...');
    if (fs.existsSync(DIST_DIR)) {
        // 保留 blog 目录，只清理其他内容
        const blogDir = path.join(DIST_DIR, 'blog');
        const blogExists = fs.existsSync(blogDir);
        let blogFiles = [];
        
        if (blogExists) {
            // 保存 blog 目录内容
            blogFiles = fs.readdirSync(blogDir);
        }
        
        fs.rmSync(DIST_DIR, { recursive: true });
        fs.mkdirSync(DIST_DIR, { recursive: true });
        
        // 恢复 blog 目录（如果有）
        if (blogExists) {
            fs.mkdirSync(blogDir, { recursive: true });
        }
    } else {
        fs.mkdirSync(DIST_DIR, { recursive: true });
    }
    
    ensureDir(path.join(DIST_DIR, 'css'));
    ensureDir(path.join(DIST_DIR, 'js'));
    ensureDir(path.join(DIST_DIR, 'images'));
    console.log('  ✓ dist/');
    console.log('  ✓ dist/css/');
    console.log('  ✓ dist/js/');
    console.log('  ✓ dist/images/');

    // 构建 Vite 前端
    await buildFrontend();

    // 复制图片等静态资源
    console.log('\n📁 复制静态资源...');
    const imagesSrc = path.join(PUBLIC_DIR, 'images');
    if (fs.existsSync(imagesSrc)) {
        copyDir(imagesSrc, path.join(DIST_DIR, 'images'));
    } else {
        console.log('  ℹ️  images 目录不存在，跳过');
    }

    // 复制 PWA 相关资源
    const pwaSrc = path.join(PUBLIC_DIR, 'pwa');
    if (fs.existsSync(pwaSrc)) {
        copyDir(pwaSrc, path.join(DIST_DIR, 'pwa'));
    } else {
        console.log('  ℹ️  pwa 目录不存在，跳过');
    }

    // 处理 CSS
    const cssStats = processCSS();

    // 处理 JS（异步）
    const jsStats = await processJS();

    // 生成 HTML
    const htmlSize = generateHTML();

    // 生成清单
    const manifest = generateManifest({ css: cssStats, js: jsStats });

    // 备份会话数据
    await backupSessionData();

    // 构建 Hexo 博客
    await buildBlog();

    // 输出摘要
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    构建完成                               ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  CSS 压缩：${cssStats.savings}% (${(cssStats.minified / 1024).toFixed(2)} KB)`);
    console.log(`║  JS 压缩：${manifest.totalSavings.js} (${(jsStats.reduce((sum, s) => sum + s.minified, 0) / 1024).toFixed(2)} KB)`);
    console.log(`║  HTML: ${(htmlSize / 1024).toFixed(2)} KB`);
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  输出目录：dist/                                          ║');
    console.log('║  博客目录：dist/blog/                                     ║');
    console.log('║  部署说明：将 dist/ 目录内容上传到 CDN 或静态主机           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

// 辅助函数定义
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyDir(src, dest) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 处理 CSS 文件
function processCSS() {
    console.log('\n📄 处理 CSS 文件...');
    const cssSrc = path.join(PUBLIC_DIR, 'css', 'style.css');
    const cssDest = path.join(DIST_DIR, 'css', 'style.css');
    const cssMinDest = path.join(DIST_DIR, 'css', 'style.min.css');

    if (fs.existsSync(cssSrc)) {
        const css = fs.readFileSync(cssSrc, 'utf-8');

        // 复制原始文件
        fs.writeFileSync(cssDest, css, 'utf-8');
        console.log(`  ✓ css/style.css`);

        // 生成压缩版本
        const minified = minifyCSS(css);
        fs.writeFileSync(cssMinDest, minified, 'utf-8');
        console.log(`  ✓ css/style.min.css (${(minified.length / 1024).toFixed(2)} KB)`);

        return {
            original: css.length,
            minified: minified.length,
            savings: ((1 - minified.length / css.length) * 100).toFixed(1)
        };
    } else {
        console.log('  ℹ️  css/style.css 不存在，跳过');
        return { original: 0, minified: 0, savings: '0' };
    }
}

// 压缩 JS（使用 terser）
async function processJS() {
    console.log('\n📄 处理 JS 文件...');
    const jsFiles = ['data.js', 'main.js', 'modules.js', 'script.js'];
    const stats = [];

    for (const file of jsFiles) {
        const src = path.join(PUBLIC_DIR, 'js', file);
        const dest = path.join(DIST_DIR, 'js', file);
        const minDest = path.join(DIST_DIR, 'js', file.replace('.js', '.min.js'));

        if (!fs.existsSync(src)) {
            console.log(`  ℹ️  js/${file} 不存在，跳过`);
            continue;
        }

        const js = fs.readFileSync(src, 'utf-8');

        // 复制原始文件
        fs.writeFileSync(dest, js, 'utf-8');
        console.log(`  ✓ js/${file}`);

        // 使用 terser 生成压缩版本
        try {
            const terserModule = await getTerser();
            const minified = await terserModule.minify(js, {
                compress: {
                    drop_console: false,
                    drop_debugger: false,
                    pure_funcs: []
                },
                mangle: {
                    reserved: ['familyTreeData', 'generationPoems', 'pptSlides', 'bcRecords', 'guestMessages']
                },
                output: {
                    comments: false
                }
            });

            fs.writeFileSync(minDest, minified.code, 'utf-8');
            console.log(`  ✓ js/${file.replace('.js', '.min.js')} (${(minified.code.length / 1024).toFixed(2)} KB)`);

            stats.push({
                file,
                original: js.length,
                minified: minified.code.length,
                savings: ((1 - minified.code.length / js.length) * 100).toFixed(1)
            });
        } catch (error) {
            console.error(`  ✗ 压缩失败 js/${file}: ${error.message}`);
            // 降级到简单压缩
            const simpleMinified = js
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
                .trim();
            fs.writeFileSync(minDest, simpleMinified, 'utf-8');
            stats.push({
                file,
                original: js.length,
                minified: simpleMinified.length,
                savings: ((1 - simpleMinified.length / js.length) * 100).toFixed(1)
            });
        }
    }

    return stats;
}

// 生成优化版 HTML
function generateHTML() {
    console.log('\n📄 生成优化版 HTML...');

    const htmlSrc = path.join(PUBLIC_DIR, 'index.html');
    const htmlDest = path.join(DIST_DIR, 'index.html');

    if (fs.existsSync(htmlSrc)) {
        let html = fs.readFileSync(htmlSrc, 'utf-8');

        // 替换为压缩版本
        html = html.replace('href="/css/style.css"', 'href="/css/style.min.css"');
        html = html.replace('src="/js/data.js"', 'src="/js/data.min.js"');
        html = html.replace('src="/js/main.js"', 'src="/js/main.min.js"');
        html = html.replace('src="/js/modules.js"', 'src="/js/modules.min.js"');
        html = html.replace('src="/js/script.js"', 'src="/js/script.min.js"');

        // 添加 CDN 预加载和 SEO 优化
        const preloadLinks = `
    <!-- CDN 预加载 -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <!-- PWA 配置 -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#8B4513">

    <!-- SEO 优化 -->
    <meta name="keywords" content="黄氏家族，寻根，族谱，字辈，黄姓，宗亲会，家族文化">
    <meta name="author" content="黄氏家族寻根平台">
    <link rel="canonical" href="https://hxfund.cn/">

    <!-- 社交媒体分享优化 -->
    <meta property="og:title" content="黄氏家族寻根平台 | hxfund.cn">
    <meta property="og:description" content="数字化传承黄氏家族文化，帮助全球宗亲查询族谱、字辈与寻根问祖。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://hxfund.cn/">
    <meta name="twitter:card" content="summary_large_image">`;

        html = html.replace('</head>', preloadLinks + '\n</head>');

        fs.writeFileSync(htmlDest, html, 'utf-8');
        console.log(`  ✓ index.html`);

        return html.length;
    } else {
        console.log('  ℹ️  index.html 不存在，跳过');
        return 0;
    }
}

// 生成资源清单
function generateManifest(stats) {
    console.log('\n📋 生成资源清单...');

    const manifest = {
        version: '3.2.0',
        buildTime: new Date().toISOString(),
        files: {
            css: {
                'style.css': stats.css,
                'style.min.css': { size: stats.css.minified, savings: stats.css.savings + '%' }
            },
            js: stats.js.map(s => ({
                file: s.file,
                original: s.original,
                minified: s.minified,
                savings: s.savings + '%'
            }))
        },
        totalSavings: {
            css: stats.css.savings + '%',
            js: (stats.js.reduce((sum, s) => sum + s.minified, 0) / stats.js.reduce((sum, s) => sum + s.original, 0) * 100).toFixed(1) + '%'
        }
    };

    const dest = path.join(DIST_DIR, 'manifest.json');
    fs.writeFileSync(dest, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`  ✓ manifest.json`);

    return manifest;
}

// 备份会话数据（压缩格式）
async function backupSessionData() {
    console.log('\n💾 备份会话数据...');

    // 创建备份目录
    const backupDir = path.join(DIST_DIR, 'backups');
    ensureDir(backupDir);

    try {
        // 检查是否有会话数据需要备份
        const sessionStorePath = path.join(__dirname, '..', 'server', 'session-store.js');
        if (!fs.existsSync(sessionStorePath)) {
            console.log('  ℹ️  会话存储模块不存在，跳过备份');
            return;
        }

        // 读取当前会话数据（如果是内存存储的话）
        // 在实际部署中，会话数据可能存储在 Redis 或其他地方
        // 这里我们创建一个示例备份

        const sessionBackup = {
            timestamp: new Date().toISOString(),
            note: '会话数据备份 - 仅用于演示目的，实际会话数据可能存储在 Redis 或其他持久化存储中',
            backupType: 'session-data-compression-backup'
        };

        // 将备份数据转换为 JSON
        const sessionData = JSON.stringify(sessionBackup, null, 2);

        // 压缩数据
        const compressedData = zlib.gzipSync(sessionData);

        // 保存压缩的备份文件
        const backupFileName = `sessions-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json.gz`;
        const backupFilePath = path.join(backupDir, backupFileName);

        fs.writeFileSync(backupFilePath, compressedData);

        console.log(`  ✓ ${path.relative(DIST_DIR, backupFilePath)} (${(compressedData.length / 1024).toFixed(2)} KB)`);

        // 同时保存未压缩的备份作为参考
        const uncompressedBackupPath = path.join(backupDir, backupFileName.replace('.gz', '.json'));
        fs.writeFileSync(uncompressedBackupPath, sessionData);

        console.log(`  ✓ ${path.relative(DIST_DIR, uncompressedBackupPath)} (${(sessionData.length / 1024).toFixed(2)} KB)`);

    } catch (error) {
        console.error(`  ✗ 会话数据备份失败: ${error.message}`);
    }
}

// 简单压缩 CSS（移除注释和多余空白）
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')  // 移除注释
        .replace(/\s+/g, ' ')              // 多余空白变单空格
        .replace(/\s*([{}:;,])\s*/g, '$1') // 移除符号周围空格
        .replace(/\n/g, '')                // 移除换行
        .trim();
}

// 运行构建
build();
