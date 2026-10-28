// מחברת קרטונית: מצייר טבעות ספירלה, מסגרת מקווקוות, תיבות סימון,
// ושומר בדפדפן את מה שכתוב בכל פנקס. דורש את notebook.css

(() => {   // הכול בתוך פונקציה, כדי שהשמות כאן לא יתנגשו בסקריפטים אחרים בדף

// פילטרים וצורות של טבעות, שכל הפנקסים בדף משתמשים בהם
document.body.insertAdjacentHTML('afterbegin', `
<svg width="0" height="0" style="position: absolute" aria-hidden="true">
<filter id="wobble">
  <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="1" seed="3" />
  <feDisplacementMap in="SourceGraphic" scale="5" />
</filter>
<!-- מעקם את הטקסט ואת הקווים יחד, רק למעלה ולמטה, כך שהטקסט הולך עם הקו -->
<filter id="ink-wave" x="0" y="-5%" width="100%" height="110%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.012 0.025" numOctaves="1" seed="8" result="noise" />
  <!-- ערוץ אדום קבוע (0.5 = בלי הזזה הצידה), ערוץ ירוק מהרעש = הזזה למעלה/למטה -->
  <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.5  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1" result="map" />
  <feDisplacementMap in="SourceGraphic" in2="map" scale="7" xChannelSelector="R" yChannelSelector="G" />
</filter>
<!-- הטבעת המלאה: מצוירת מתחת לדף, ולכן הקצה שלה נעלם מתחתיו. שלוש צורות, כדי שלא כולן ייראו אותו דבר -->
<symbol id="ring-back" viewBox="0 0 64 40">
  <path d="M44 14 C30 2 6 4 6 18 C6 30 22 36 40 30" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" />
</symbol>
<symbol id="ring-back-2" viewBox="0 0 64 40">
  <path d="M44 14 C28 1 3 7 7 21 C10 33 25 34 40 27" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" />
</symbol>
<symbol id="ring-back-3" viewBox="0 0 64 40">
  <path d="M44 14 C32 4 9 1 5 15 C2 29 19 38 41 32" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" />
</symbol>
<!-- החור, והקטע הקצר שיוצא ממנו מעל הדף -->
<symbol id="ring-front" viewBox="0 0 64 40">
  <path d="M44 14 C40 10 35 8 28 7.5" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" />
  <circle cx="50" cy="16" r="7" fill="#000" />
</symbol>
</svg>`);

// טבעות הספירלה: 5 בגודל הרגיל, ועוד טבעת על כל "צעד" שהפנקס גדל.
// לכל טבעת צורה, הטיה ומתיחה משלה, שתמיד יוצאות אותו דבר לאותה טבעת
const NS = 'http://www.w3.org/2000/svg';
const pseudo = (p, i, k) => ((p * 7919 + i * 104729 + k * 1299709) % 1000) / 1000;

function drawRings(pad, p) {
  const pitch = pad.offsetWidth * (255 / 385) * 0.96 / 5;   // גובה טבעת אחת בפנקס בגודל הרגיל
  const count = Math.max(5, Math.round(pad.offsetHeight * 0.96 / pitch));
  if (pad.dataset.rings == count) return;
  pad.dataset.rings = count;
  pad.querySelectorAll('.spiral').forEach(s => s.remove());

  const height = count * 45 - 5;
  const layers = ['back', 'front'].map(kind => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', kind === 'back' ? 'spiral spiral-back' : 'spiral');
    svg.setAttribute('viewBox', `0 0 64 ${height}`);
    return svg;
  });
  for (let i = 0; i < count; i++) {
    const y = i * 45, hole = y + 16;
    const shape = 1 + Math.floor(pseudo(p, i, 1) * 3);
    const tilt = (pseudo(p, i, 2) * 18 - 9).toFixed(1);
    const stretch = (0.92 + pseudo(p, i, 3) * 0.2).toFixed(2);
    // הטיה ומתיחה סביב החור, כדי שהטבעת תישאר מחוברת אליו
    const transform = `rotate(${tilt} 50 ${hole}) translate(50 ${hole}) scale(1 ${stretch}) translate(-50 -${hole})`;
    layers.forEach((svg, l) => {
      const use = document.createElementNS(NS, 'use');
      use.setAttribute('href', l === 1 ? '#ring-front' : shape === 1 ? '#ring-back' : `#ring-back-${shape}`);
      for (const [a, v] of [['y', y], ['width', 64], ['height', 40], ['transform', transform]]) use.setAttribute(a, v);
      svg.appendChild(use);
    });
  }
  pad.prepend(...layers);
}

// מסגרת מקווקוות קרטונית: כל מקף הוא קו נפרד.
// העובי והאורך של המקף משתנים לאורך כל צלע: עבים ליד הפינות, דקים באמצע
function drawFrame(pad, p) {
  const cq = pad.offsetWidth / 100;
  const W = pad.offsetWidth - 20 * cq, H = pad.offsetHeight - 16 * cq;
  let svg = pad.querySelector('.frame');
  if (svg && svg.dataset.size === `${W}x${H}`) return;
  if (!svg) {
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'frame');
    svg.setAttribute('aria-hidden', 'true');
    pad.append(svg);
  }
  svg.dataset.size = `${W}x${H}`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const scale = Math.max(0.7, cq / 3);             // מקפים גדלים מעט בפנקס גדול
  const sides = [[W * 0.08, 0, W, 0], [W, 0, W, H], [W * 0.08, H, W, H]];
  const parts = [];
  sides.forEach(([x1, y1, x2, y2], side) => {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L;  // כיוון הצלע
    const nx = -uy, ny = ux;                         // ניצב לצלע, בשביל הגל
    const phase = pseudo(p, side, 4) * Math.PI * 2;
    let s = 0, k = 0;
    while (s < L) {
      const t = s / L;
      const jitter = 0.85 + pseudo(p, side * 97 + k, 5) * 0.3;
      const w = (1.6 + 3.2 * Math.abs(Math.cos(Math.PI * t)) ** 1.5) * scale * jitter;  // עובי
      const len = Math.min((5 + 2.2 * w), L - s);                                         // אורך
      const wave = (a) => 1.6 * scale * Math.sin((a / L) * Math.PI * 3 + phase);
      const a = s, b = s + len;
      const ax = x1 + ux * a + nx * wave(a), ay = y1 + uy * a + ny * wave(a);
      const bx = x1 + ux * b + nx * wave(b), by = y1 + uy * b + ny * wave(b);
      parts.push(`<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke-width="${w.toFixed(2)}" />`);
      s += len + 4 * scale + w * 0.7;                // רווח: גדל עם עובי המקף
      k++;
    }
  });
  svg.innerHTML = `<g style="stroke: var(--frame-ink)" stroke-linecap="round">${parts.join('')}</g>`;
}

document.querySelectorAll('.pad').forEach((pad, p) => {
  new ResizeObserver(() => { drawRings(pad, p); drawFrame(pad, p); }).observe(pad);
});

// כותרות שאפשר לערוך: שורה אחת בלבד, ונשמרות בדפדפן
document.querySelectorAll('.pad h2').forEach((title, i) => {
  const key = `notebook:${location.pathname}:title-${i}`;   // מפתח נפרד לכל דף
  try { const saved = localStorage.getItem(key); if (saved !== null) title.textContent = saved; } catch {}
  title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
  title.addEventListener('input', () => {
    if (!title.textContent.trim()) title.textContent = '';   // כדי ש-:empty יציג את הטקסט האפור
    try { localStorage.setItem(key, title.textContent); } catch {}
  });
});

// שומר את מה שכתוב בכל פנקס בדפדפן, ומוסיף תיבת סימון לכל שורה
document.querySelectorAll('.pad textarea').forEach((note, i) => {
  const key = `notebook:${location.pathname}:note-${i}`;   // מפתח נפרד לכל דף
  const doneKey = `notebook:${location.pathname}:done-${i}`;
  const pad = note.closest('.pad');

  // עוטף את התיבה, ומוסיף לידה העתק למדידה ושכבה לסימונים
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  note.before(sheet);
  const mirror = document.createElement('div');
  mirror.className = 'mirror';
  mirror.setAttribute('aria-hidden', 'true');
  const marks = document.createElement('div');
  marks.className = 'marks';
  sheet.append(note, mirror, marks);

  // השורות שסומנו נשמרות לפי הטקסט שלהן
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(doneKey) ?? '[]')); } catch {}
  const saveDone = () => { try { localStorage.setItem(doneKey, JSON.stringify([...done])); } catch {} };

  function layout() {
    const cs = getComputedStyle(note);
    mirror.style.padding = cs.padding;
    mirror.style.direction = cs.direction;
    const lines = note.value.split('\n');
    const spans = lines.map(text => {
      const span = document.createElement('span');
      span.textContent = text || '​';
      return span;
    });
    mirror.replaceChildren(...spans.flatMap((s, k) => k ? ['\n', s] : [s]));

    // הפנקס מוטה (transform), ולכן המידות מהמסך מסובבות. ממירים אותן למערכת
    // הצירים של הדף: מרחק מהפינה של ה-sheet, מוקרן על הצירים המסובבים.
    // כך לא צריך לכבות את ההטיה בזמן המדידה, וה-hover לא נקטע
    const m = new DOMMatrix(getComputedStyle(pad).transform);
    const cos = m.a, sin = m.b;                       // הסיבוב של הפנקס
    const sheetRect = sheet.getBoundingClientRect();
    const sheetAbs = { w: sheet.offsetWidth, h: sheet.offsetHeight };
    // פינת ה-sheet במסך: המרכז של הקופסה המסובבת, פחות חצי גודל מסובב
    const cx = sheetRect.left + sheetRect.width / 2, cy = sheetRect.top + sheetRect.height / 2;
    const ox = cx - (sheetAbs.w / 2) * cos + (sheetAbs.h / 2) * sin;
    const oy = cy - (sheetAbs.w / 2) * sin - (sheetAbs.h / 2) * cos;
    const local = (x, y) => ({ x: (x - ox) * cos + (y - oy) * sin, y: -(x - ox) * sin + (y - oy) * cos });
    // קופסה של שורה, במערכת הצירים של הדף
    const localRect = (r) => {
      const c = local(r.left + r.width / 2, r.top + r.height / 2);
      return { left: c.x - r.width / 2, top: c.y - r.height / 2, width: r.width, height: r.height };
    };
    const fs = parseFloat(cs.fontSize);
    const box = fs * 0.75;
    const rtl = cs.direction === 'rtl';
    const items = [];
    spans.forEach((span, k) => {
      const text = lines[k].trim();
      if (!text) return;
      const rects = [...span.getClientRects()].map(localRect);
      if (!rects.length) return;
      const first = rects[0];
      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'check' + (done.has(text) ? ' done' : '');
      check.setAttribute('aria-label', 'mark done: ' + text);
      check.setAttribute('aria-pressed', done.has(text));
      check.style.top = (first.top + first.height / 2 - box / 2) + 'px';
      check.style[rtl ? 'right' : 'left'] = ((fs * 1.3 - box) / 2) + 'px';
      check.addEventListener('click', () => {
        done.has(text) ? done.delete(text) : done.add(text);
        saveDone();
        layout();
      });
      items.push(check);
      if (done.has(text)) {
        for (const r of rects) {
          const strike = document.createElement('div');
          strike.className = 'strike';
          strike.style.left = (r.left - 2) + 'px';
          strike.style.width = (r.width + 4) + 'px';
          strike.style.top = (r.top + r.height * 0.55 - fs * 0.175) + 'px';
          items.push(strike);
        }
      }
    });
    marks.replaceChildren(...items);
  }

  // מגדיל את התיבה לפי הטקסט, והפנקס גדל איתה
  const grow = () => { note.style.height = 'auto'; note.style.height = note.scrollHeight + 'px'; };
  // טקסט ששמור בדפדפן מחליף את הטקסט שכתוב ב-HTML
  try { const saved = localStorage.getItem(key); if (saved !== null) note.value = saved; } catch {}
  grow();
  layout();
  note.addEventListener('input', () => {
    grow();
    layout();
    try { localStorage.setItem(key, note.value); } catch {}
  });
  new ResizeObserver(layout).observe(sheet);
  document.fonts.ready.then(layout);
});
})();
