(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- 3D ring ---------- */
  const ids = [2, 24, 61, 33, 14, 65, 95, 49, 116, 19, 63, 37, 110, 76, 59, 27];
  const stage = $('#ring');
  const n = ids.length;
  let radius = 0;
  ids.forEach((id, i) => {
    const c = document.createElement('div');
    c.className = 'ring__card';
    c.dataset.n = 'ai_' + String(id).padStart(3, '0');
    c.innerHTML = `<img src="img/s${id}.jpg" alt="" ${i > 5 ? 'loading="lazy"' : ''} decoding="async">`;
    stage.appendChild(c);
  });
  const cards = $$('.ring__card', stage);
  function layout() {
    const w = stage.offsetWidth;
    radius = Math.round((w * 1.08) / (2 * Math.tan(Math.PI / n)));
    cards.forEach((c, i) => {
      c.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`;
    });
  }
  layout();
  addEventListener('resize', layout);

  let rot = 0, tiltX = -8, tx = -8, ty = 0, my = 0, scrollBoost = 0, lastY = scrollY;
  if (fine) addEventListener('mousemove', e => {
    tx = -8 + (e.clientY / innerHeight - .5) * -10;
    ty = (e.clientX / innerWidth - .5) * 14;
  });
  addEventListener('scroll', () => {
    const d = scrollY - lastY; lastY = scrollY;
    scrollBoost += d * 0.04;
  }, { passive: true });

  /* ---------- marquee rows (drift + scroll) ---------- */
  const rows = $$('.row').map(r => {
    const t = $('.row__track', r);
    t.innerHTML += t.innerHTML; // duplicate for loop
    return { t, speed: parseFloat(r.dataset.speed), x: 0 };
  });

  /* ---------- horizontal series ---------- */
  const series = $('#series'), track = $('#seriesTrack');

  function frame() {
    // ring
    scrollBoost *= 0.92;
    rot -= (reduce ? 0 : 0.12) + scrollBoost;
    tiltX += (tx - tiltX) * 0.05;
    my += (ty - my) * 0.05;
    if (scrollY < innerHeight * 1.2)
      stage.style.transform = `translateZ(-${radius}px) rotateX(${tiltX}deg) rotateY(${rot + my}deg)`;

    // rows
    rows.forEach(r => {
      const half = r.t.scrollWidth / 2;
      r.x -= reduce ? 0 : r.speed + scrollBoost * 0.6 * Math.sign(r.speed);
      if (r.x < -half) r.x += half;
      if (r.x > 0) r.x -= half;
      r.t.style.transform = `translate3d(${r.x}px,0,0)`;
    });

    // series
    const rect = series.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) {
      const total = series.offsetHeight - innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / total));
      const dist = track.scrollWidth - innerWidth;
      track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- nav ---------- */
  const nav = $('.nav');
  addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 40), { passive: true });

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 80 + 'ms'; io.observe(el); });

  /* ---------- videos: load & play only when visible ---------- */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.src) { v.src = v.dataset.src; v.preload = 'auto'; }
      if (!reduce) v.play().catch(() => {});
    } else if (v.src) v.pause();
  }), { rootMargin: '200px 0px' });
  $$('video[data-src]').forEach(v => vio.observe(v));

  /* ---------- guess flip ---------- */
  $$('.flip').forEach(f => f.addEventListener('click', () => f.classList.toggle('is-on')));

  /* ---------- tabs ---------- */
  const tabs = $('.tabs');
  function setTab(name) {
    $$('.tabs__btn').forEach(b => b.classList.toggle('is-on', b.dataset.tab === name));
    $$('.tabpane').forEach(p => p.classList.toggle('is-on', p.dataset.pane === name));
    tabs.classList.toggle('is-film', name === 'film');
  }
  $$('.tabs__btn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $$('a[data-tab]').forEach(a => a.addEventListener('click', () => setTab(a.dataset.tab)));

  /* ---------- accordions ---------- */
  $$('.mod__body').forEach(b => {
    const w = document.createElement('div');
    while (b.firstChild) w.appendChild(b.firstChild);
    b.appendChild(w);
  });
  $$('.mod__head').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('is-open')));

  /* ---------- price toggle ---------- */
  const fmt = v => Number(v).toLocaleString('ru-RU').replace(/ /g, ' ');
  $('#filmToggle').addEventListener('change', e => {
    const on = e.target.checked;
    $('.plans').classList.toggle('with-film', on);
    $$('[data-base]').forEach(s => {
      s.classList.add('is-swap');
      setTimeout(() => { s.textContent = fmt(on ? s.dataset.film : s.dataset.base); s.classList.remove('is-swap'); }, 220);
    });
  });

  /* ---------- buy buttons: links добавим 10.12 ---------- */
  const LINKS = { self: '', check: '', personal: '', film: '', self_film: '', check_film: '' };
  $$('.plan__btn').forEach(b => b.addEventListener('click', e => {
    const film = $('#filmToggle').checked && (b.dataset.plan === 'self' || b.dataset.plan === 'check');
    const url = LINKS[b.dataset.plan + (film ? '_film' : '')];
    if (url) { b.href = url; return; }
    e.preventDefault();
    b.textContent = 'откроется 10.12 🤍';
  }));

  /* ---------- cursor ---------- */
  if (fine && !reduce) {
    const cur = $('.cursor');
    let cx = 0, cy = 0, x = 0, y = 0;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; });
    (function loop() {
      cx += (x - cx) * .2; cy += (y - cy) * .2;
      cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    $$('.flip, .v, .series__track figure, .pair figure').forEach(el => {
      el.addEventListener('mouseenter', () => cur.classList.add('is-big'));
      el.addEventListener('mouseleave', () => cur.classList.remove('is-big'));
    });
  }
})();
