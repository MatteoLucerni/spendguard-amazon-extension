document.addEventListener('DOMContentLoaded', function () {
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineMq = window.matchMedia('(hover: hover) and (pointer: fine)');
  var wideMq = window.matchMedia('(min-width: 1024px)');
  var hasIO = 'IntersectionObserver' in window;
  var motion = !reduceMq.matches && hasIO;
  if (motion) root.classList.add('has-motion');

  function clamp(v, min, max) {
    return Math.min(max === undefined ? 1 : max, Math.max(min === undefined ? 0 : min, v));
  }

  var atmosphere = document.createElement('div');
  atmosphere.className = 'atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.append(document.createElement('div'), document.createElement('div'), document.createElement('div'));
  document.body.prepend(atmosphere);

  var updaters = new Map();
  var active = new Set();
  var toneSections = Array.prototype.slice.call(document.querySelectorAll('[data-tone]'));
  var ticking = 0;

  var sectionObserver = hasIO
    ? new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) active.add(entry.target);
            else active.delete(entry.target);
          });
          schedule();
        },
        { rootMargin: '25% 0px 25% 0px' }
      )
    : null;

  function register(el, fn) {
    updaters.set(el, fn);
    if (sectionObserver) sectionObserver.observe(el);
    else active.add(el);
    fn(window.innerHeight);
  }

  function updateTone(vh) {
    if (!toneSections.length) return;
    var tone = toneSections[0].dataset.tone;
    toneSections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= vh * 0.55) tone = section.dataset.tone;
    });
    if (root.dataset.tone !== tone) root.dataset.tone = tone;
  }

  function frame() {
    ticking = 0;
    var vh = window.innerHeight;
    active.forEach(function (el) {
      updaters.get(el)(vh);
    });
    updateTone(vh);
  }

  function schedule() {
    if (!ticking) ticking = window.requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });

  function onceVisible(el, threshold, fn) {
    if (!hasIO) return fn();
    var observer = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        fn();
      },
      { threshold: threshold }
    );
    observer.observe(el);
  }

  var header = document.querySelector('.header');
  var mobileToggle = document.querySelector('.header__mobile-toggle');
  var mobileLinks = document.querySelectorAll('.header__nav a');

  function setMenu(open) {
    header.classList.toggle('is-open', open);
    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (header && mobileToggle) {
    mobileToggle.addEventListener('click', function () {
      setMenu(!header.classList.contains('is-open'));
    });

    mobileLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        setMenu(false);
      });
    });

    document.addEventListener('pointerdown', function (e) {
      if (header.classList.contains('is-open') && !header.contains(e.target)) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        setMenu(false);
        mobileToggle.focus();
      }
    });
  }

  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--d', i % 3);
        items.push(child);
      });
    });
    if (!motion || !items.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    var vh = window.innerHeight;
    items.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.92 && rect.bottom > 0) return;
      el.classList.add('reveal');
      observer.observe(el);
    });

    document.addEventListener('focusin', function (e) {
      var el = e.target.closest('.reveal:not(.is-visible)');
      if (el) el.classList.add('is-visible');
    });
  }

  function initSpotlight() {
    if (!fineMq.matches) return;
    document.querySelectorAll('.spotlight').forEach(function (el) {
      var raf = 0;
      var x = 0;
      var y = 0;
      el.addEventListener('pointermove', function (e) {
        var rect = el.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
        if (raf) return;
        raf = window.requestAnimationFrame(function () {
          raf = 0;
          el.style.setProperty('--mx', x.toFixed(1) + 'px');
          el.style.setProperty('--my', y.toFixed(1) + 'px');
        });
      });
    });
  }

  function initMagnetic() {
    if (!motion || !fineMq.matches) return;
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var rect = el.getBoundingClientRect();
        var dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
        var dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
        el.style.setProperty('--mag-x', (dx * 12).toFixed(2) + 'px');
        el.style.setProperty('--mag-y', (dy * 10).toFixed(2) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.removeProperty('--mag-x');
        el.style.removeProperty('--mag-y');
      });
    });
  }

  function initHeroGlow() {
    var hero = document.querySelector('.hero');
    var glow = document.querySelector('.hero__glow');
    if (!hero || !glow || !motion || !fineMq.matches) return;
    var tx = 0;
    var ty = 0;
    var x = null;
    var y = null;
    var raf = 0;

    function tick() {
      raf = 0;
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      glow.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%)';
      if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) raf = window.requestAnimationFrame(tick);
    }

    hero.addEventListener('pointermove', function (e) {
      var rect = hero.getBoundingClientRect();
      tx = e.clientX - rect.left;
      ty = e.clientY - rect.top;
      if (x === null) {
        x = tx;
        y = ty;
      }
      if (!raf) raf = window.requestAnimationFrame(tick);
    });
  }

  function initDomains() {
    var wrap = document.querySelector('[data-domains]');
    if (!wrap || !motion) return;
    var track = wrap.querySelector('.domains__track');
    var items = Array.prototype.map.call(track.children, function (li) {
      return li.textContent;
    });
    var build = function (list) {
      var row = document.createElement('div');
      row.className = 'domains__track';
      row.setAttribute('aria-hidden', 'true');
      list.concat(list).forEach(function (text) {
        var span = document.createElement('span');
        span.textContent = text;
        row.append(span);
      });
      return row;
    };
    track.classList.add('visually-hidden');
    track.classList.remove('domains__track');
    wrap.append(build(items), build(items.slice().reverse()));
    wrap.classList.add('is-marquee');
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        wrap.classList.toggle('is-offscreen', !entries[0].isIntersecting);
      }).observe(wrap);
    }
  }

  function initDemo() {
    var demo = document.querySelector('[data-demo]');
    if (!demo || !motion) return;
    var clock = demo.querySelector('[data-clock]');
    var amounts = Array.prototype.slice.call(demo.querySelectorAll('[data-amount]'));

    var CYCLE = 16;
    var timeline = [
      [0, 'idle'],
      [2, 'armed'],
      [4, 'blocked'],
      [10, 'release'],
      [13, 'idle']
    ];
    var START = 8 * 60 + 59;
    var LOCK = 9 * 60;
    var END = 18 * 60;
    var NEXT = 24 * 60 + START;

    var ease = function (x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };
    var fmt = function (m) {
      m = Math.round(m) % (24 * 60);
      var h = Math.floor(m / 60);
      var min = m % 60;
      return (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
    };
    var minutesAt = function (t) {
      if (t < 2) return START;
      if (t < 10.2) return LOCK;
      if (t < 11.8) return LOCK + (END - LOCK) * ease((t - 10.2) / 1.6);
      if (t < 13) return END;
      if (t < 14.4) return END + (NEXT - END) * ease((t - 13) / 1.4);
      return NEXT;
    };

    var elapsed = 0;
    var last = 0;
    var raf = 0;
    var visible = true;
    var state = '';
    var clockText = '';
    var countStart = -1;

    function render(t, now) {
      var next = timeline[0][1];
      timeline.forEach(function (step) {
        if (t >= step[0]) next = step[1];
      });
      if (next !== state) {
        state = next;
        demo.dataset.state = state;
      }
      var text = fmt(minutesAt(t));
      if (text !== clockText) {
        clockText = text;
        clock.textContent = text;
      }
      if (countStart >= 0) {
        var p = clamp((now - countStart) / 1400);
        amounts.forEach(function (el) {
          el.textContent = Math.round(Number(el.dataset.amount) * ease(p)) + ' $';
        });
        if (p >= 1) countStart = -2;
      }
    }

    function tick(now) {
      raf = 0;
      if (last) elapsed = (elapsed + Math.min(0.1, (now - last) / 1000)) % CYCLE;
      last = now;
      if (countStart === -1) countStart = now;
      render(elapsed, now);
      if (visible && !document.hidden) raf = window.requestAnimationFrame(tick);
    }

    function start() {
      if (raf || !visible || document.hidden) return;
      last = 0;
      raf = window.requestAnimationFrame(tick);
    }

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        start();
      }).observe(demo);
    }
    document.addEventListener('visibilitychange', start);
    start();
  }

  function initShowcase() {
    var showcase = document.querySelector('[data-showcase]');
    if (!showcase) return;
    var stage = showcase.querySelector('.stage');
    var list = showcase.querySelector('.screenshots__steps');
    var steps = Array.prototype.slice.call(showcase.querySelectorAll('.screenshot'));
    var images = Array.prototype.slice.call(showcase.querySelectorAll('.stage__screens img'));
    var title = showcase.querySelector('[data-stage-title]');
    var count = showcase.querySelector('[data-stage-count]');
    var link = showcase.querySelector('[data-stage-link]');
    if (!stage || !steps.length) return;
    var current = -1;

    register(showcase, function (vh) {
      var focus = vh * 0.5;
      if (!wideMq.matches && getComputedStyle(showcase).display !== 'grid') {
        var stageRect = stage.getBoundingClientRect();
        focus = (clamp(stageRect.bottom, 0, vh) + vh) / 2;
      }
      var best = 0;
      var bestDistance = Infinity;
      var centers = steps.map(function (step) {
        var rect = step.getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
      centers.forEach(function (center, i) {
        var distance = Math.abs(center - focus);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      var span = centers[centers.length - 1] - centers[0] || 1;
      list.style.setProperty('--progress', clamp((focus - centers[0]) / span).toFixed(4));
      if (best === current) return;
      current = best;
      stage.dataset.step = String(best + 1);
      steps.forEach(function (step, i) {
        step.classList.toggle('is-active', i === best);
      });
      images.forEach(function (img, i) {
        img.classList.toggle('is-active', i === best);
      });
      if (title) title.textContent = steps[best].dataset.title;
      if (count) count.textContent = '0' + (best + 1);
      if (link) link.setAttribute('href', steps[best].dataset.shot);
    });
  }

  function initSteps() {
    var el = document.querySelector('[data-steps]');
    if (!el || !motion) return;
    var items = Array.prototype.slice.call(el.children);
    var n = items.length;
    register(el, function (vh) {
      var rect = el.getBoundingClientRect();
      var p = clamp((vh * 0.85 - rect.top) / (vh * 0.4 + rect.height * 0.3));
      el.style.setProperty('--p', p.toFixed(4));
      items.forEach(function (item, i) {
        item.classList.toggle('is-lit', p >= (n > 1 ? i / (n - 1) : 0) - 0.02);
      });
    });
  }

  function initFaq() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
    items.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) return;
        items.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  function initFabZones() {
    var zones = Array.prototype.slice.call(document.querySelectorAll('.hero'));
    if (!zones.length || !hasIO) return;
    var visible = new Set();
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });
        root.classList.toggle('fab-hidden', visible.size > 0);
      },
      { rootMargin: '-20% 0px -25% 0px' }
    );
    zones.forEach(function (zone) {
      observer.observe(zone);
    });
  }

  initReveal();
  initSpotlight();
  initMagnetic();
  initHeroGlow();
  initDomains();
  initDemo();
  initShowcase();
  initSteps();
  initFaq();
  initFabZones();
  frame();

  // Feedback widget
  var feedbackWidget = document.querySelector('.feedback');
  var feedbackFab = document.querySelector('.feedback__fab');

  function setFeedback(open) {
    feedbackWidget.classList.toggle('open', open);
    feedbackFab.setAttribute('aria-expanded', String(open));
  }

  if (feedbackFab && feedbackWidget) {
    feedbackFab.addEventListener('click', function () {
      setFeedback(!feedbackWidget.classList.contains('open'));
    });

    // Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!feedbackWidget.contains(e.target)) {
        setFeedback(false);
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        setFeedback(false);
      }
    });
  }
});
