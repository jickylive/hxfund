/**
 * 黄氏家族寻根平台 - 动画工具
 */

export function setupAnimations() {
  // 数字动画（统计数字）- 使用 requestAnimationFrame 优化性能
  const animateNumbers = () => {
    const statNums = document.querySelectorAll('.stat-num');

    statNums.forEach(num => {
      const target = parseInt(num.getAttribute('data-count'));
      if (!target) return;

      const duration = 2000; // 2 秒动画
      const startTime = performance.now();
      const startValue = 0;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 ease-out 缓动函数
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (target - startValue) * easeOut);

        num.textContent = currentValue.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          num.textContent = target.toLocaleString();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  // 使用 Intersection Observer 在可见时触发动画
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const section = entry.target;
        section.classList.add('visible');

        // 如果是首页区域，触发动画
        if (section.id === 'home') {
          animateNumbers();
        }

        observer.unobserve(section);
      }
    });
  }, observerOptions);

  // 观察所有 section
  document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
  });

  console.log('✅ 动画功能已设置');
}