/**
 * 黄氏家族寻根平台 - 回到顶部工具
 */

export function setupBackToTop() {
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    const handleBackToTopScroll = () => {
      if (window.scrollY > 300) {
        backToTop.classList.add('show');
      } else {
        backToTop.classList.remove('show');
      }
    };

    backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    window.addEventListener('scroll', handleBackToTopScroll, { passive: true });
    handleBackToTopScroll(); // 初始化检查
  }

  console.log('✅ 回到顶部功能已设置');
}