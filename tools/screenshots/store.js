(() => {
  const HARNESS_FILE = '.harness.generated.html';
  const SCENE_VIEWPORT = { width: 720, height: 640 };
  const STAGE = { width: 840, height: 800 };

  const STORE_SHOTS = {
    widget: {
      scene: 'widget-results',
      headline: 'Know what you <span>spend</span> on Amazon™',
      subline: '30-day and 3-month totals on every page, calculated in your browser.',
      scale: 1.6,
      focus: { x: 195, y: 140 },
    },
    'normal-lock': {
      scene: 'normal-lock',
      headline: 'Block <span>impulse</span> purchases',
      subline: 'Normal lock: keep browsing, but checkout stays locked during your hours.',
      scale: 1.8,
      focus: { x: 253, y: 40 },
    },
    'checkout-warning': {
      scene: 'checkout-warning',
      headline: 'Think <span>twice</span> at checkout',
      subline: 'A reminder of what you already spent, right before you pay.',
      scale: 1.8,
      focus: { x: 253, y: 40 },
    },
    'hard-lock': {
      scene: 'hard-lock',
      headline: 'Or lock Amazon™ <span>entirely</span>',
      subline: 'Hard lock: a full-screen countdown until your lock hours end.',
      scale: 1.25,
      focus: { x: 48, y: 0 },
    },
    settings: {
      scene: 'settings',
      headline: 'Set it up in <span>seconds</span>',
      subline: 'Time ranges, lock hours and lock mode in one panel. No account, no servers.',
      scale: 1.8,
      focus: { x: 253, y: 196 },
    },
  };

  const shotName = new URLSearchParams(window.location.search).get('shot');
  const shot = STORE_SHOTS[shotName];

  if (!shot) {
    document.body.textContent = `Unknown store shot: ${shotName}`;
    return;
  }

  const visibleWidth = STAGE.width / shot.scale;
  const visibleHeight = STAGE.height / shot.scale;
  const x = Math.max(0, Math.min(shot.focus.x, SCENE_VIEWPORT.width - visibleWidth));
  const y = Math.max(0, Math.min(shot.focus.y, SCENE_VIEWPORT.height - visibleHeight));

  document.body.innerHTML = `
    <div class="store-copy">
      <div class="store-brand">
        <img src="../../assets/images/icons/amz_icon.png" alt="">
        SpendGuard
      </div>
      <h1 class="store-headline">${shot.headline}</h1>
      <div class="store-accent"></div>
      <p class="store-subline">${shot.subline}</p>
    </div>
    <div class="store-stage">
      <iframe
        src="${HARNESS_FILE}?scene=${encodeURIComponent(shot.scene)}"
        width="${SCENE_VIEWPORT.width}"
        height="${SCENE_VIEWPORT.height}"
        scrolling="no"
        style="transform: scale(${shot.scale}) translate(${-x}px, ${-y}px);"
      ></iframe>
    </div>
  `;
})();
