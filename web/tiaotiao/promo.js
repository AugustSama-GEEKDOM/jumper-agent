(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = (p) => { p = clamp(p); return p * p * (3 - 2 * p); };
  const smooth = (p) => { p = clamp(p); return p === 0 ? 0 : p === 1 ? 1 : 1 - Math.pow(2, -10 * p); };
  const win = (t, a, b, fi = .55, fo = .55) => Math.min(ease((t - a) / fi), ease((b - t) / fo));
  const px = (n) => `${n.toFixed(2)}px`;
  const deg = (n) => `${n.toFixed(2)}deg`;
  const opacity = (r) => clamp(r);
  const canvas = $('#fx');
  const ctx = canvas.getContext('2d');
  const scenes = {
    opening: [.15, 3.18],
    presence: [3.18, 7.72],
    weather: [7.72, 11.82],
    music: [11.82, 16.05],
    action: [16.05, 21.02],
    agent: [21.02, 24.85],
    emotion: [24.85, 27.82],
    finale: [27.82, 30.01]
  };
  const sceneNames = {
    opening: 'INTRO', presence: 'PRESENCE', weather: 'SENSE', music: 'RHYTHM',
    action: 'MOTION', agent: 'AGENT', emotion: 'EMOTION', finale: 'FINALE'
  };
  const captions = {
    opening: ['跳跳 · 会看 · 会听 · 会行动', 'A ROBOT WITH A SOUL'],
    presence: ['眼睛，是它与你交流的第一种语言', 'PRESENCE WITH A HEARTBEAT'],
    weather: ['今天徐州 26°，晴朗，适合出门走走', 'SENSE THE WORLD'],
    music: ['已为你找到：星际来信 · 跳跳推荐', 'MUSIC, SHAPED BY VOICE'],
    action: ['收到。动作，已经发生。', 'FROM LANGUAGE TO MOTION'],
    agent: ['一句话，连接天气、音乐与动作', 'AGENT WITH ENDLESS POSSIBILITIES'],
    emotion: ['每一种情绪，都是真实的回应', 'EMOTION IN MOTION'],
    finale: ['一只会回应你的机器人', 'TIAOTIAO / 2026']
  };

  function buildEyes(container, close = false) {
    container.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const unit = document.createElement('div');
      unit.className = 'eye-unit';
      unit.innerHTML = `
        <div class="eye-glow"></div>
        <div class="eye-orb">
          <div class="eye-iris"><div class="eye-pupil"></div></div>
          <div class="eye-shape"></div>
          <div class="eye-lid"></div>
        </div>
        <div class="blush"></div>
        <div class="eye-effect question">?</div>
        <div class="eye-effect loader"></div>
        <div class="eye-effect sparkle">✦</div>`;
      container.appendChild(unit);
    }
    container._eyes = $$('.eye-unit', container);
    return container;
  }

  const eyeHosts = ['#hero-eyes-presence', '#hero-eyes-emotion', '#hero-eyes-final'].map(id => buildEyes($(id)));
  const robotFace = $('#robot-eyes');
  robotFace.innerHTML = '<div class="robot-eye"></div><div class="robot-eye"></div>';
  const robotEyes = $$('.robot-eye', robotFace);
  const core = $('#agent-eyes');
  core.innerHTML = '<div class="mini-eye"></div><div class="mini-eye"></div>';
  const coreEyes = $$('.mini-eye', core);

  function setEyeState(host, state, t, variation = 0) {
    const units = host._eyes || $$('.eye-unit', host);
    units.forEach((unit, i) => {
      unit.className = `eye-unit ${state === 'wink' && i === 1 ? 'is-wink' : ''}`;
      if (state === 'thinking') unit.classList.add('is-think');
      if (state === 'happy') unit.classList.add('is-happy');
      if (state === 'shy') unit.classList.add('is-shy');
      if (state === 'question') unit.classList.add('is-question');
      const blink = (t + variation + i * .07) % 4.2 < .105;
      if (blink && !['happy', 'shy', 'wink'].includes(state) && !(state === 'wink' && i === 1)) unit.classList.add('is-blink');
      const iris = $('.eye-iris', unit);
      const orb = $('.eye-orb', unit);
      let x = Math.sin(t * .78 + i * 1.5 + variation) * 10;
      let y = Math.cos(t * .71 + i * .63 + variation) * 7;
      let sx = 1, sy = 1, angle = 0;
      if (state === 'listening') {
        x = Math.sin(t * 1.2 + i * Math.PI) * 14;
        y = Math.sin(t * .9) * 5;
        sx = 1 + Math.sin(t * 4.4 + i) * .035; sy = 1 + Math.sin(t * 4.4 + i) * .055;
      } else if (state === 'thinking') {
        x = Math.sin(t * 1.55 + i * 2.3) * 19;
        y = Math.cos(t * 1.3 + i * .9) * 11 - 2;
        sx = .9; sy = .82; angle = Math.sin(t * 1.2 + i) * 8;
      } else if (state === 'question') {
        x = Math.sin(t * 1.05 + i * 1.4) * 23;
        y = Math.cos(t * .88 + i) * 12;
        sx = 1.04; sy = 1.1;
      } else if (state === 'happy') {
        x = Math.sin(t * 1.8 + i) * 4; y = -10;
      } else if (state === 'shy') {
        x = (i ? 20 : -20) + Math.sin(t * .8) * 5; y = 9;
      } else if (state === 'wink') {
        x = Math.sin(t * .85) * 11; y = Math.cos(t * .65) * 7;
      }
      iris.style.setProperty('--look-x', px(x));
      iris.style.setProperty('--look-y', px(y));
      iris.style.setProperty('--eye-scale-x', sx.toFixed(3));
      iris.style.setProperty('--eye-scale-y', sy.toFixed(3));
      iris.style.setProperty('--eye-angle', deg(angle));
      const blinkScale = unit.classList.contains('is-blink') ? .12 : 1;
      orb.style.transform = `translateY(${px(Math.sin(t * .8 + i) * 2)}) scaleY(${blinkScale})`;
      const q = $('.eye-effect.question', unit);
      q.style.opacity = state === 'question' && i === 1 ? '1' : '0';
      q.style.transform = `translate(${Math.sin(t * 2.2) * 7}px, ${Math.cos(t * 1.7) * 3}px) rotate(${Math.sin(t * 1.9) * 8}deg) scale(${1 + Math.sin(t * 2.2) * .04})`;
      const loader = $('.eye-effect.loader', unit);
      loader.style.opacity = state === 'thinking' && i === 1 ? '1' : '0';
      loader.style.transform = `rotate(${t * 250}deg)`;
      const sparkle = $('.eye-effect.sparkle', unit);
      sparkle.style.opacity = state === 'wink' && i === 1 ? String(.55 + .35 * Math.sin(t * 8)) : '0';
      sparkle.style.transform = `translate(${Math.sin(t * 3.2) * 5}px, ${Math.cos(t * 2.8) * 5}px) rotate(${t * 28}deg) scale(${1.1 + Math.sin(t * 4.7) * .28})`;
      const blush = $('.blush', unit);
      blush.style.opacity = state === 'shy' ? '.72' : '0';
      blush.style.transform = `translateY(${Math.sin(t * 2) * 2}px) scaleX(${1 + Math.sin(t * 2.1) * .08})`;
    });
  }

  function setRobotEyesState(state, t) {
    robotFace.className = `robot-face ${state}`;
    robotEyes.forEach((eye, i) => {
      const blink = (t + i * .035) % 3.6 < .09;
      let scaleX = 1, scaleY = 1, rotate = 0, x = Math.sin(t * 2.4 + i) * 1.7, y = Math.cos(t * 1.8 + i) * 1.1;
      if (state === 'wink' && i === 1) { scaleX = .42; scaleY = .2; rotate = -12; x = 2; }
      else if (state === 'happy') { scaleY = .62; y = -2; }
      else if (state === 'thinking') { scaleX = .82; scaleY = .55; rotate = i ? 8 : -8; }
      if (blink && !(state === 'wink' && i === 1)) scaleY = .08;
      eye.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${rotate}deg) scale(${scaleX},${scaleY})`;
      eye.style.opacity = state === 'wink' && i === 1 ? '.18' : '1';
    });
  }

  function setCoreState(t, active) {
    coreEyes.forEach((eye, i) => {
      const pulse = .88 + Math.sin(t * 4.2 + i * .7) * .08;
      eye.style.setProperty('--blink', active ? pulse.toFixed(3) : '0.06');
      eye.style.transform = `scaleY(${active ? pulse.toFixed(3) : '.06'}) translate(${Math.sin(t * 1.3 + i) * 3}px,0)`;
    });
  }

  function setScene(name, t, alpha, y = 0, scale = 1, blur = 0) {
    const el = $(`[data-scene="${name}"]`);
    el.style.opacity = alpha.toFixed(4);
    el.style.visibility = alpha < .002 ? 'hidden' : 'visible';
    el.style.transform = `translate3d(0,${y.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
    el.style.filter = blur > .02 ? `blur(${blur.toFixed(2)}px)` : 'none';
    return el;
  }

  function setInner(el, alpha, tx = 0, ty = 0, scale = 1, blur = 0) {
    if (!el) return;
    el.style.opacity = alpha.toFixed(4);
    el.style.transform = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
    el.style.filter = blur > .02 ? `blur(${blur.toFixed(2)}px)` : 'none';
  }

  const stars = Array.from({ length: 92 }, (_, i) => ({
    x: (Math.sin(i * 937.17) * 43758.5453 % 1 + 1) % 1,
    y: (Math.sin(i * 271.91 + 17.3) * 18351.231 % 1 + 1) % 1,
    r: .45 + (((i * 19) % 17) / 17) * 1.5,
    s: .15 + (((i * 13) % 23) / 23) * .52,
    p: i * .73
  }));

  function drawCanvas(t, intensity) {
    ctx.clearRect(0, 0, 1920, 1080);
    ctx.save();
    const gradient = ctx.createRadialGradient(1320, 510, 40, 1150, 500, 690);
    gradient.addColorStop(0, `rgba(87,198,220,${.045 * intensity})`);
    gradient.addColorStop(.42, `rgba(22,78,93,${.025 * intensity})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1920, 1080);
    for (const p of stars) {
      const x = (p.x * 1920 + Math.sin(t * p.s + p.p) * 18 + 1920) % 1920;
      const y = (p.y * 1080 + Math.cos(t * p.s * .8 + p.p) * 21 + 1080) % 1080;
      const a = (.12 + .3 * (.5 + .5 * Math.sin(t * 1.4 + p.p))) * intensity;
      ctx.beginPath(); ctx.fillStyle = `rgba(159,236,249,${a})`; ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(1130, 545);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(119,213,232,${(.012 + i * .004) * intensity})`;
      ctx.lineWidth = 1;
      ctx.ellipse(0, 0, 360 + i * 148, 160 + i * 89, t * .018 + i * .68, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderOpening(t, a) {
    const intro = ease((t - .1) / 1.15);
    const out = ease((3.2 - t) / .52);
    const op = opacity(intro * out);
    const h1 = $('.opening h1');
    h1.style.clipPath = `inset(0 ${Math.max(0, 100 - intro * 100).toFixed(2)}% 0 0)`;
    setInner($('.opening-copy .kicker'), opacity((t - .2) / .7 * out), 0, (1 - intro) * 20);
    setInner($('.opening-seal'), opacity((t - .35) / .9 * out), 0, (1 - intro) * 34, .84 + .16 * intro);
    setInner($('.opening-index'), opacity((t - .4) / .8 * out), -(1 - intro) * 25, 0);
    setInner($('.opening-line'), opacity((t - .65) / .6 * out), 0, 0, .35 + .65 * ease((t - .65) / 1.2));
    $('.opening-seal').style.transform += ` rotate(${t * 4}deg)`;
    h1.style.transform = `translate3d(0,${(1 - intro) * 43}px,0)`;
  }

  function renderPresence(t, a) {
    const p = win(t, 3.2, 7.72, .7, .65);
    const local = t - 3.2;
    setInner($('.presence-copy'), opacity(smooth((local - .18) / .85) * opacity((7.75 - t) / .5)), 0, (1 - smooth((local - .18) / .85)) * 28);
    setInner($('.presence-tags'), opacity(smooth((local - .8) / .6)), 0, (1 - smooth((local - .8) / .6)) * 15);
    setInner($('.listen-status'), opacity(smooth((local - .55) / .5) * (.78 + .22 * Math.sin(t * 5))), 0, 0);
    const host = $('#hero-eyes-presence');
    const scl = .93 + ease((local - .05) / .9) * .07 + Math.sin(t * 1.1) * .004;
    host.style.transform = `translateY(${px(Math.sin(t * .85) * 6)}) scale(${scl.toFixed(4)})`;
    const state = local < 2.35 ? 'normal' : 'listening';
    setEyeState(host, state, t, .4);
    setInner($('.hero-halo'), opacity(smooth(local / .85) * .9), 0, 0, .76 + ease(local / 3.8) * .24);
    $('.hero-halo').style.transform += ` rotate(${t * 2}deg)`;
  }

  function renderWeather(t, a) {
    const local = t - 7.72;
    const inA = smooth((local - .05) / .66);
    const inB = smooth((local - .31) / .68);
    setInner($('.weather-disc'), opacity(inA), -(1 - inA) * 32, (1 - inA) * 20, .78 + .22 * inA);
    setInner($('.data-kicker'), opacity(inB), 0, (1 - inB) * 15);
    $('.weather-disc').style.transform += ` rotate(${(local * 1.6).toFixed(2)}deg)`;
    $('.sun-rays').style.transform = `rotate(${local * 16}deg) scale(${1 + Math.sin(t * 1.8) * .025})`;
    $('.disc-ring').style.transform = `rotate(${-17 + local * 2.1}deg)`;
    const w = $('.weather-right');
    w.style.opacity = inB;
    w.style.transform = `translate3d(${(1 - inB) * 40}px,${(1 - inB) * 12}px,0)`;
    $('.weather-temp b').style.transform = `translateY(${Math.sin(t * 1.2) * 2}px)`;
    $$('.weather-orbit').forEach((o, i) => o.style.transform = `rotate(${local * (i ? 1.1 : -1.3) + i * 23}deg) ${i ? 'scaleX(.45)' : 'scaleY(.44)'} translateX(${Math.sin(t * .5) * 5}px)`);
  }

  function renderMusic(t, a) {
    const local = t - 11.82;
    const inA = smooth((local - .06) / .72);
    const inB = smooth((local - .34) / .68);
    const disc = $('#music-disc');
    disc.style.transform = `translate3d(0,${(1 - inA) * 32}px,0) rotate(${local * 31.5}deg) scale(${.83 + .17 * inA})`;
    disc.style.opacity = inA;
    $('.music-needle').style.transform = `rotate(${18 - 3 * ease((local - .53) / .6) + Math.sin(t * 2) * .7}deg)`;
    $('.music-needle').style.opacity = opacity((local - .42) / .46);
    const info = $('.music-info');
    info.style.opacity = inB;
    info.style.transform = `translate3d(0,${(1 - inB) * 28}px,0)`;
    $$('.waveform i').forEach((b, i) => {
      const h = 10 + Math.abs(Math.sin(t * 6.3 + i * .71)) * 29 + Math.abs(Math.sin(t * 2.1 + i * .19)) * 8;
      b.style.height = `${h.toFixed(1)}px`;
    });
    const lx = Math.sin(t * .9) * 7;
    $('.lyric-live').style.transform = `translate3d(${px(lx)},0,0)`;
    $('.lyric-ghost').style.transform = `translate3d(${px(32 + lx * .5)},-50%,0)`;
    $('.time-row .track i').style.width = `${39 + local * 1.5}%`;
  }

  function renderAction(t, a) {
    const local = t - 16.05;
    const robot = $('#robot');
    const arms = [$('.arm-left'), $('.arm-right')];
    const legs = [$('.leg-left'), $('.leg-right')];
    let rx = 0, ry = 0, rot = 0, al = 10, ar = -10, ll = 0, lr = 0, bodyScale = 1;
    let command = 'dance';
    if (local >= 1.48 && local < 2.7) command = 'walk';
    if (local >= 2.7) command = 'handshake';
    if (command === 'dance') {
      const beat = local * 7.2;
      rot = Math.sin(beat) * 3.4;
      ry = -Math.abs(Math.sin(beat)) * 10;
      rx = Math.sin(beat * .5) * 6;
      al = 10 + (48 + Math.sin(beat) * 28);
      ar = -10 - (48 + Math.sin(beat + .5) * 28);
      ll = Math.sin(beat) * 8; lr = -Math.sin(beat) * 8;
    } else if (command === 'walk') {
      const w = local - 1.48;
      const step = w * 7.5;
      rx = clamp(w * 43, 0, 42);
      ry = -Math.abs(Math.sin(step)) * 11;
      ll = Math.sin(step) * 17; lr = -Math.sin(step) * 17;
      al = 10 - Math.sin(step) * 23; ar = -10 + Math.sin(step) * 23;
      rot = Math.sin(step) * 1.1;
    } else {
      const h = local - 2.7;
      rx = 42 * (1 - ease((h - .8) / .4));
      ry = Math.sin(h * 3) * 2;
      ar = -78 + Math.sin(t * 7) * 12;
      al = 11;
      rot = -1.5;
      bodyScale = 1.02;
    }
    robot.style.transform = `translate3d(${rx.toFixed(2)}px,${ry.toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg) scale(${bodyScale})`;
    arms[0].style.transform = `rotate(${al.toFixed(2)}deg) translateY(${Math.sin(t * 2.5) * 2}px)`;
    arms[1].style.transform = `rotate(${ar.toFixed(2)}deg) translateY(${Math.sin(t * 2.5 + .6) * 2}px)`;
    legs[0].style.transform = `rotate(${ll.toFixed(2)}deg)`;
    legs[1].style.transform = `rotate(${lr.toFixed(2)}deg)`;
    $('.robot-head').style.transform = `translateY(${Math.sin(t * 2.1) * 2}px) rotate(${Math.sin(t * 1.3) * 1.5}deg)`;
    $$('.command').forEach(c => c.classList.toggle('active', c.dataset.command === command));
    $('#reply-chip').textContent = command === 'dance' ? '好呀，跳一段！' : command === 'walk' ? '没问题，向前走。' : '来吧，握个手。';
    const eyeState = command === 'handshake' ? 'happy' : command === 'walk' ? 'normal' : 'wink';
    setRobotEyesState(eyeState, t);
    $('.robot-glow').style.transform = `translate(-50%,-50%) scale(${1.04 + Math.sin(t * 2.2) * .035})`;
    $$('.motion-arc').forEach((arc, i) => {
      arc.style.opacity = String((command === 'dance' ? .42 : .13) * opacity((local - .15 - i * .12) / .7));
      arc.style.transform = `rotate(${local * (i % 2 ? -12 : 18) + i * 18}deg)`;
    });
  }

  function renderAgent(t, a) {
    const local = t - 21.02;
    const leftIn = smooth((local - .05) / .65);
    const coreIn = smooth((local - .26) / .66);
    const resultIn = smooth((local - 1.45) / .8);
    setInner($('.agent-copy'), opacity(leftIn), -(1 - leftIn) * 30, 0);
    setInner($('.prompt-card'), opacity(smooth((local - .3) / .7)), 0, (1 - smooth((local - .3) / .7)) * 20);
    const cr = $('.agent-core');
    cr.style.opacity = coreIn;
    cr.style.transform = `scale(${.78 + .22 * coreIn + Math.sin(t * 1.2) * .004})`;
    $$('.core-ring').forEach((r, i) => r.style.transform = `rotate(${local * (i % 2 ? -5 : 8) + i * 31}deg)`);
    setCoreState(t, local > .7);
    $$('.node').forEach((n, i) => {
      const nIn = smooth((local - .55 - i * .13) / .52);
      n.style.opacity = nIn;
      n.style.transform = `scale(${.82 + .18 * nIn + Math.sin(t * 2.1 + i) * .015})`;
    });
    $$('.agent-links path').forEach((p, i) => {
      p.style.strokeDashoffset = `${-local * 24 - i * 8}`;
      p.style.opacity = opacity((local - .7 - i * .2) / .7);
    });
    $$('.agent-results span').forEach((s, i) => {
      s.style.opacity = opacity((resultIn - i * .12));
      s.style.transform = `translateY(${(1 - opacity(resultIn - i * .12)) * 8}px)`;
    });
    $$('.prompt-wave i').forEach((bar, i) => bar.style.height = `${5 + Math.abs(Math.sin(t * 6 + i * .72)) * 14}px`);
  }

  const emotionStates = ['question', 'wink', 'thinking', 'happy', 'shy', 'normal'];
  const emotionWords = ['好奇', '俏皮', '思考', '兴奋', '害羞', '灵动'];
  function renderEmotion(t, a) {
    const local = t - 24.85;
    const inA = smooth((local - .02) / .6);
    setInner($('.emotion-copy'), opacity(inA), -(1 - inA) * 35, 0);
    const host = $('#hero-eyes-emotion');
    host.style.opacity = String(inA);
    host.style.transform = `translateY(${px(Math.sin(local * .8) * 4)}) scale(${.92 + .08 * inA})`;
    const idx = Math.min(5, Math.floor(local / .48));
    const state = emotionStates[idx];
    setEyeState(host, state, t, 2.8);
    $('#emotion-word').textContent = emotionWords[idx];
    $('#emotion-index').textContent = `0${idx + 1} / 06`;
    const flash = 1 - Math.abs((local / .48) % 1 - .5) * 2;
    $('#emotion-word').style.opacity = String(.4 + flash * .55);
    $('#emotion-word').style.transform = `translateY(${Math.sin(t * 2.7) * 2}px)`;
    $('.emotion-ring').style.transform = `rotate(${local * 8}deg)`;
    $('.emotion-ring').style.opacity = String(inA * .85);
  }

  function renderFinale(t, a) {
    const local = t - 27.82;
    const eyeIn = smooth((local - .04) / .9);
    const copyIn = smooth((local - .58) / .8);
    const host = $('#hero-eyes-final');
    host.style.opacity = String(eyeIn);
    host.style.transform = `translateY(${px((1 - eyeIn) * 20)}) scale(${.82 + .18 * eyeIn})`;
    setEyeState(host, local > 1.22 ? 'happy' : 'normal', t, 3.4);
    setInner($('.finale-copy'), opacity(copyIn), 0, (1 - copyIn) * 24);
    $('.finale-copy h1').style.letterSpacing = `${lerp(-.2, -.08, copyIn).toFixed(4)}em`;
    $$('.finale-rings i').forEach((r, i) => {
      r.style.opacity = String(.22 + .45 * opacity((local - .1 - i * .12) / .9));
      r.style.transform = `translate(-50%,-50%) rotate(${local * (i % 2 ? -2 : 3)}deg) scale(${.74 + .26 * eyeIn + i * .015})`;
    });
    $('.finale-line').style.width = `${copyIn * 330}px`;
    $('.finale-tags').style.opacity = String(opacity((copyIn - .25) / .6));
    $('.finale-footer').style.opacity = String(opacity((copyIn - .3) / .6));
  }

  function render(t) {
    t = clamp(Number(t) || 0, 0, 30);
    drawCanvas(t, 1 - ease((t - 27.9) / 1.9));
    for (const [name, [start, end]] of Object.entries(scenes)) {
      const a = name === 'opening' ? 1 : win(t, start, end, .1, .45);
      if (name === 'opening') setScene(name, t, opacity((3.28 - t) / .35), 0, .97 + .03 * ease(t / 3), t > 2.7 ? (t - 2.7) * 4 : 0);
      else if (name === 'finale') setScene(name, t, a, 0, 1);
      else setScene(name, t, a, (1 - smooth((t - start) / .6)) * 18, .985 + .015 * smooth((t - start) / .65), (1 - smooth((t - start) / .38)) * 5);

      if (t < start - .05 || t > end + .05) continue;
      if (name === 'opening') renderOpening(t, a);
      if (name === 'presence') renderPresence(t, a);
      if (name === 'weather') renderWeather(t, a);
      if (name === 'music') renderMusic(t, a);
      if (name === 'action') renderAction(t, a);
      if (name === 'agent') renderAgent(t, a);
      if (name === 'emotion') renderEmotion(t, a);
      if (name === 'finale') renderFinale(t, a);
    }

    let current = 'opening';
    for (const [name, [start, end]] of Object.entries(scenes)) if (t >= start - .05 && t < end) current = name;
    $('#rail-scene').textContent = sceneNames[current];
    const frames = Math.max(0, Math.round(t * 60));
    const ss = Math.floor(t); const ff = Math.floor((t - ss) * 60);
    $('#rail-time').textContent = `00:${String(ss).padStart(2,'0')}:${String(ff).padStart(2,'0')}`;
    $('#timeline-progress').style.width = `${(t / 30 * 100).toFixed(3)}%`;
    $('.timeline em').style.left = `${(t / 30 * 100).toFixed(3)}%`;
    const cap = captions[current] || captions.finale;
    const sc = $('#scene-caption');
    const ca = current === 'opening' || current === 'finale' ? 0 : opacity((t - scenes[current][0] - .6) / .6);
    sc.style.opacity = String(ca);
    sc.innerHTML = `<span>${cap[0]}</span><b>${cap[1]}</b>`;
    const flashPulse = [3.18, 7.72, 11.82, 16.05, 21.02, 24.85, 27.82].reduce((m, x) => Math.max(m, 1 - Math.abs(t - x) / .21), 0);
    $('#transition-flash').style.opacity = String(clamp(flashPulse) * .45);
    $('#end-black').style.opacity = String(clamp((t - 29.42) / .58));
    $('.top-rail').style.opacity = String(opacity((t - .2) / .6) * opacity((29.82 - t) / .38));
    $('.bottom-rail').style.opacity = String(opacity((t - .45) / .6) * opacity((29.82 - t) / .38));
  }

  window.renderAt = async (t) => {
    render(t);
    await new Promise(requestAnimationFrame);
    return true;
  };
  window.promoDuration = 30;

  document.fonts.ready.then(() => { render(0); window.promoReady = true; });
  render(0);
})();
