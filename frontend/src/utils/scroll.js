/**
 * 黄氏家族寻根平台 - 滚动工具
 */

export function setupSmoothScroll() {
  // 滚动时导航栏效果
  const mainHeader = document.getElementById('mainHeader');
  if (mainHeader) {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        mainHeader.classList.add('scrolled');
      } else {
        mainHeader.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始化检查
  }

  console.log('✅ 平滑滚动功能已设置');
}