/**
 * 黄氏家族寻根平台 - 导航工具
 */

export function setupNavigation() {
  // 平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 70;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
        });
        this.classList.add('active');

        // 移动端关闭菜单
        const nav = document.getElementById('mainNav');
        if (nav && nav.classList.contains('show')) {
          nav.classList.remove('show');
          document.getElementById('hamburgerBtn')?.classList.remove('active');
        }
      }
    });
  });

  // 汉堡菜单
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mainNav = document.getElementById('mainNav');

  if (hamburgerBtn && mainNav) {
    hamburgerBtn.addEventListener('click', () => {
      mainNav.classList.toggle('show');
      hamburgerBtn.classList.toggle('active');
    });
  }

  console.log('✅ 导航功能已设置');
}