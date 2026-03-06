/**
 * 黄氏家族寻根平台 - UI 助手
 * 提供常用的 UI 操作方法
 */

export class UIHelper {
    constructor() {
        // 构造函数
    }

    // 元素抖动效果
    shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }

    // 淡入效果
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        
        setTimeout(() => {
            element.style.opacity = '1';
        }, 10);
    }

    // 淡出效果
    fadeOut(element, duration = 300, callback) {
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.style.display = 'none';
            if (callback) callback();
        }, duration);
    }

    // 滚动到元素
    scrollToElement(selector, offset = 0) {
        const element = document.querySelector(selector);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    // 显示加载状态
    showLoading(element, message = '加载中...') {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        
        element.appendChild(loader);
        return loader;
    }

    // 隐藏加载状态
    hideLoading(element, loader) {
        if (loader && element.contains(loader)) {
            element.removeChild(loader);
        }
    }

    // 显示提示信息
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 添加样式
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '9999',
            padding: '12px 20px',
            borderRadius: '6px',
            color: '#fff',
            backgroundColor: type === 'error' ? '#e74c3c' : type === 'success' ? '#2ecc71' : '#3498db',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease';
            toast.style.opacity = '0';
            
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    }

    // 创建防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 创建节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    // 格式化数字（如：1000 -> 1,000）
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // 验证邮箱格式
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // 验证手机号格式（中国）
    validatePhone(phone) {
        const re = /^1[3-9]\d{9}$/;
        return re.test(phone);
    }

    // 转义 HTML 特殊字符
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // 获取 URL 参数
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // 添加 CSS 类（带条件）
    addClassIf(element, className, condition) {
        if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }

    // 切换 CSS 类
    toggleClass(element, className) {
        element.classList.toggle(className);
    }

    // 检查元素是否在视口内
    isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // 获取元素相对于文档的位置
    getElementOffset(el) {
        const rect = el.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
    }
}