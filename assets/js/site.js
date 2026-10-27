/* THE CLUB TOGARI — progressive enhancement. All content is in the HTML; this only adds motion. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Anywhere other than the live domain is a preview: keep it out of search results
  var isPreview = !/(^|\.)togari\.jp$/.test(location.hostname);
  if (isPreview) {
    var noindex = document.createElement('meta');
    noindex.name = 'robots';
    noindex.content = 'noindex, nofollow';
    var existing = document.querySelector('meta[name="robots"]');
    if (existing) existing.remove();
    document.head.appendChild(noindex);
  }
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  // progress of p within [a, b], clamped to 0..1
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var easeInOut = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  var header = document.querySelector('[data-header]');

  /* Menu */
  var menu = document.querySelector('[data-menu]');
  var toggle = document.querySelector('[data-menu-toggle]');
  function setMenu(open) {
    if (!menu || !toggle) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-btn__label').textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) menu.querySelector('a').focus();
  }
  if (toggle) {
    toggle.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
    });
  }

  /* Statement: split into words that light up as they cross the viewport */
  var words = [];
  document.querySelectorAll('[data-words]').forEach(function (el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(/\s+/).forEach(function (w) {
      var span = document.createElement('span');
      span.className = 'w';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = w;
      el.appendChild(span);
      el.appendChild(document.createTextNode(' '));
      words.push(span);
    });
  });

  /* Reveal on scroll */
  var revealTargets = document.querySelectorAll('.section-title, .statement__cols p, .card, .benefits__grid li, .residence__media, .access__map, .faq__list details, .partners__list li, .contact .form');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealTargets.forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = (i % 3) * 80 + 'ms';
      io.observe(el);
    });
  }

  /* ---------- Hero intro ----------
     Timeline over the pinned hero (p = 0..1):
       0.00–0.32  dolly toward the cabin (or scrub a <video> if one is placed in the scene),
                  copy lifts away, side mist closes in, whiteout fog rises
       0.32       swap: the whiteout is now the inside of the "R" in TOGARI
       0.32–0.72  wordmark zooms out over the clubhouse at dusk
       0.58–0.74  tagline in
       0.80–1.00  wordmark out, fade to navy into the next section */
  var hero = document.querySelector('[data-hero]');
  var H = hero && {
    scene: hero.querySelector('[data-scene]'),
    video: hero.querySelector('[data-scene] video'),
    copy: hero.querySelector('[data-copy]'),
    mistBack: hero.querySelector('[data-mist-back]'),
    mistL: hero.querySelector('[data-mist-l]'),
    mistR: hero.querySelector('[data-mist-r]'),
    fog: hero.querySelector('[data-fog]'),
    reveal: hero.querySelector('[data-reveal-layer]'),
    dusk: hero.querySelector('[data-dusk]'),
    logo: hero.querySelector('[data-logo]'),
    tagline: hero.querySelector('[data-tagline]'),
    black: hero.querySelector('[data-black]'),
    hint: hero.querySelector('[data-hint]'),
    snow: hero.querySelector('[data-snow]')
  };
  var heroLive = !!hero && !reduce;
  if (heroLive) hero.classList.add('is-live');

  // Wordmark geometry (logo_w.svg units): the zoom starts inside the stem of the "R".
  var LOGO = { w: 598, h: 103.24, fx: 453.3, fy: 72.5, safeR: 8 };
  function logoViewBox(t) {
    var stage = H.logo.parentNode, vw = stage.clientWidth, vh = stage.clientHeight, a = vw / vh;
    // start: small enough that the stroke covers the whole screen (half-diagonal < safeR)
    var w0 = (2 * LOGO.safeR) / Math.sqrt(1 + 1 / (a * a));
    // end: wordmark spans ~62% of the width (max 760px), nudged up to leave room for the tagline
    var w1 = LOGO.w * vw / Math.min(vw * 0.62, 760);
    var w = w0 * Math.pow(w1 / w0, t);
    var k = (w - w0) / (w1 - w0);
    var cx = lerp(LOGO.fx, LOGO.w / 2, k);
    var cy = lerp(LOGO.fy, LOGO.h / 2 + (w / a) * 0.06, k);
    var h = w / a;
    return (cx - w / 2).toFixed(3) + ' ' + (cy - h / 2).toFixed(3) + ' ' + w.toFixed(3) + ' ' + h.toFixed(3);
  }

  // Snow: two depths of flakes; scroll speed pushes them along like wind.
  var snow = { ctx: null, flakes: [], vy: 0, lastY: window.scrollY, on: false };
  function sizeSnow() {
    if (!H || !H.snow) return;
    var c = H.snow, dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    snow.ctx = c.getContext('2d');
    snow.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(clamp(c.clientWidth * c.clientHeight / 9000, 60, 220));
    snow.flakes = [];
    for (var i = 0; i < n; i++) {
      var z = Math.random();
      snow.flakes.push({ x: Math.random() * c.clientWidth, y: Math.random() * c.clientHeight, z: z, r: .6 + z * 2.4, s: .3 + z * 1.1, d: Math.random() * 6.28 });
    }
  }
  function drawSnow() {
    if (!snow.on || !snow.ctx) return;
    var c = H.snow, w = c.clientWidth, h = c.clientHeight, ctx = snow.ctx;
    snow.vy *= 0.92;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (var i = 0; i < snow.flakes.length; i++) {
      var f = snow.flakes[i];
      f.d += 0.01;
      f.y += f.s + snow.vy * (0.15 + f.z * 0.5);
      f.x += Math.sin(f.d) * 0.3 * f.s;
      if (f.y > h + 5) { f.y = -5; f.x = Math.random() * w; }
      if (f.y < -6) { f.y = h + 4; }
      ctx.globalAlpha = 0.35 + f.z * 0.55;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(drawSnow);
  }

  function heroFrame(y, vh) {
    var range = hero.offsetHeight - vh;
    var p = range > 0 ? clamp(y / range, 0, 1) : 0;

    // velocity for the snow
    snow.vy = clamp(snow.vy + (y - snow.lastY) * 0.08, -14, 14);
    snow.lastY = y;
    var wasOn = snow.on;
    snow.on = y < hero.offsetHeight;
    if (snow.on && !wasOn) requestAnimationFrame(drawSnow);

    // Act 1 — dolly toward the cabin
    var d = easeInOut(seg(p, 0, 0.32));
    if (H.video && H.video.duration) {
      H.video.currentTime = d * (H.video.duration - 0.05);
    } else {
      H.scene.style.transform = 'scale(' + lerp(1.04, 1.75, d).toFixed(4) + ') translate3d(' + lerp(0, 4, d).toFixed(2) + '%,' + lerp(0, -2, d).toFixed(2) + '%,0)';
    }
    var c = seg(p, 0, 0.13);
    H.copy.style.opacity = (1 - c).toFixed(3);
    H.copy.style.transform = 'translate3d(0,' + (-c * 110).toFixed(1) + 'px,0)';
    H.hint.style.opacity = (1 - seg(p, 0, 0.04)).toFixed(3);

    var mb = seg(p, 0, 0.3);
    H.mistBack.style.transform = 'translate3d(' + (-mb * 8).toFixed(2) + '%,' + (-mb * 10).toFixed(2) + '%,0) scale(' + (1 + mb * .3).toFixed(3) + ')';
    H.mistBack.style.opacity = (0.35 + mb * 0.4).toFixed(3);

    var m = easeOut(seg(p, 0.1, 0.31));
    var shift = (1 - m) * 70;
    H.mistL.style.opacity = H.mistR.style.opacity = (m * 0.95).toFixed(3);
    H.mistL.style.transform = 'translate3d(' + (-shift).toFixed(2) + '%,0,0) scale(' + (1 + m * .6).toFixed(3) + ')';
    H.mistR.style.transform = 'translate3d(' + shift.toFixed(2) + '%,0,0) scale(' + (1 + m * .6).toFixed(3) + ') scaleX(-1)';

    var fogT = easeInOut(seg(p, 0.16, 0.32));
    H.fog.style.transform = 'translate3d(0,' + (-fogT * (vh + hero.querySelector('.hero__fog').offsetHeight * 0.4)).toFixed(1) + 'px,0)';

    // Act 2 — the whiteout becomes the wordmark
    var revealed = p >= 0.32;
    H.reveal.classList.toggle('is-on', revealed);
    H.fog.style.visibility = H.mistL.style.visibility = H.mistR.style.visibility = revealed ? 'hidden' : '';
    H.scene.style.visibility = H.copy.style.visibility = revealed ? 'hidden' : '';
    if (revealed) {
      H.logo.setAttribute('viewBox', logoViewBox(easeOut(seg(p, 0.32, 0.72))));
      H.dusk.style.transform = 'scale(' + lerp(1.35, 1, easeOut(seg(p, 0.32, 1))).toFixed(4) + ')';
      var tg = easeOut(seg(p, 0.58, 0.74));
      var out = seg(p, 0.8, 0.94);
      H.tagline.style.opacity = (tg * (1 - out)).toFixed(3);
      H.tagline.style.transform = 'translate3d(0,' + ((1 - tg) * 14).toFixed(1) + 'px,0)';
      H.logo.style.opacity = (1 - out).toFixed(3);
    }

    // Act 3 — fade to navy
    H.black.style.opacity = easeInOut(seg(p, 0.84, 1)).toFixed(3);
    return p;
  }

  /* Pinned horizontal feature track (wide screens only) */
  var hs = document.querySelector('[data-hscroll]');
  var track = hs && hs.querySelector('[data-track]');
  var pinned = false;
  function layoutTrack() {
    if (!hs || !track) return;
    var want = !reduce && window.innerWidth >= 900 && window.innerHeight >= 600;
    pinned = want;
    hs.classList.toggle('is-pinned', want);
    if (want) {
      var distance = Math.max(0, track.scrollWidth - window.innerWidth);
      hs.style.height = (window.innerHeight + distance) + 'px';
      hs.dataset.distance = distance;
    } else {
      hs.style.height = '';
      track.style.transform = '';
    }
  }

  var parallax = document.querySelectorAll('[data-parallax]');
  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    var y = window.scrollY;

    var heroEnd = hero ? hero.offsetHeight - vh * 0.1 : vh * 0.9;
    if (header) header.classList.toggle('is-solid', y > heroEnd);

    if (heroLive) heroFrame(y, vh);

    if (words.length) {
      var line = vh * 0.72;
      for (var i = 0; i < words.length; i++) {
        words[i].classList.toggle('on', words[i].getBoundingClientRect().top < line);
      }
    }

    if (pinned) {
      var r = hs.getBoundingClientRect();
      var d = +hs.dataset.distance || 0;
      var p = clamp(-r.top / Math.max(1, hs.offsetHeight - vh), 0, 1);
      track.style.transform = 'translate3d(' + (-p * d).toFixed(1) + 'px,0,0)';
    }

    if (!reduce) {
      parallax.forEach(function (el) {
        var b = el.parentElement.getBoundingClientRect();
        if (b.bottom < 0 || b.top > vh) return;
        var t = (b.top + b.height / 2 - vh / 2) / vh;
        el.style.transform = 'translate3d(0,' + (t * -8).toFixed(2) + '%,0)';
      });
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  if (heroLive) {
    sizeSnow();
    if (H.video) { H.video.pause(); H.video.muted = true; }
  }
  layoutTrack();
  frame();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { layoutTrack(); if (heroLive) sizeSnow(); onScroll(); });
  window.addEventListener('load', function () { layoutTrack(); onScroll(); });

  /* Contact form: client-side email match check, then normal POST */
  var form = document.querySelector('[data-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var e1 = form.querySelector('[name="email"]');
    var e2 = form.querySelector('[name="email_confirm"]');
    if (status && /[?&]sent=0/.test(location.search)) {
      status.textContent = 'Your enquiry could not be sent. Please check the form or call +81 269 65 2359.';
    }
    form.addEventListener('submit', function (e) {
      if (e1.value.trim().toLowerCase() !== e2.value.trim().toLowerCase()) {
        e.preventDefault();
        e2.setCustomValidity('Email addresses do not match.');
        e2.reportValidity();
        return;
      }
      // Preview hosts (GitHub Pages, local) cannot run contact.php
      if (isPreview) {
        e.preventDefault();
        if (status) status.textContent = 'This is a preview of the new site, so the form is switched off. To enquire, please call +81 269 65 2359.';
        return;
      }
      if (status) status.textContent = 'Sending…';
    });
    e2.addEventListener('input', function () { e2.setCustomValidity(''); });
  }
})();
