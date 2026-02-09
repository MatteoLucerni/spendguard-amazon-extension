document.addEventListener('DOMContentLoaded', function () {
  const header = document.querySelector('.header');
  const mobileToggle = document.querySelector('.header__mobile-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileClose = document.querySelector('.mobile-nav__close');
  const mobileLinks = document.querySelectorAll('.mobile-nav__links a');

  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 10);
  });

  if (mobileToggle) {
    mobileToggle.addEventListener('click', function () {
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (mobileClose) {
    mobileClose.addEventListener('click', closeMobileNav);
  }

  if (mobileNav) {
    mobileNav.addEventListener('click', function (e) {
      if (e.target === mobileNav) closeMobileNav();
    });
  }

  mobileLinks.forEach(function (link) {
    link.addEventListener('click', closeMobileNav);
  });

  document.querySelectorAll('.faq-item__question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = this.closest('.faq-item');
      var answer = item.querySelector('.faq-item__answer');
      var isActive = item.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(function (other) {
        other.classList.remove('active');
        other.querySelector('.faq-item__answer').style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Feedback widget
  var feedbackWidget = document.querySelector('.feedback');
  var feedbackFab = document.querySelector('.feedback__fab');

  if (feedbackFab && feedbackWidget) {
    feedbackFab.addEventListener('click', function () {
      feedbackWidget.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!feedbackWidget.contains(e.target)) {
        feedbackWidget.classList.remove('open');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        feedbackWidget.classList.remove('open');
      }
    });
  }
});
