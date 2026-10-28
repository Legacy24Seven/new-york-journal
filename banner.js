// הפס הירוק: הטקסט נכנס מימין, האותיות גדלות אחת אחרי השנייה,
// עומד 3 שניות, נסוג קצת ימינה (תנופה), ויורה החוצה שמאלה. ואז חוזר חלילה.
(() => {
  const line = document.querySelector('.line');
  const track = line?.querySelector('.track');
  const text = track?.querySelector('p');
  if (!text) return;

  // כל אות ב-span משלה, כדי שכל אחת תוכל לגדול לבד. רווחים נשארים טקסט רגיל
  const letters = [];
  text.replaceChildren(...[...text.textContent].map(ch => {
    if (ch === ' ') return document.createTextNode(' ');
    const span = document.createElement('span');
    span.className = 'letter';
    span.textContent = ch;
    letters.push(span);
    return span;
  }));
  text.setAttribute('aria-label', text.textContent);   // קורא מסך מקריא משפט, לא אות-אות

  // כל אות מצוירת גדולה מההתחלה (פי BIG) ומוצגת מוקטנת. כך בשיא של הקפיצה היא בגודל האמיתי שלה
  // וחדה, במקום שהדפדפן ימתח תמונה של אות קטנה ויטשטש אותה
  const BIG = 3.2;
  const box = new Map();   // הגודל המקורי של כל אות
  function drawBig() {
    letters.forEach(l => { l.style.cssText = ''; });
    const fs = parseFloat(getComputedStyle(text).fontSize);
    letters.forEach(l => box.set(l, { w: l.offsetWidth, h: l.offsetHeight }));
    letters.forEach(l => {
      const { w, h } = box.get(l);
      Object.assign(l.style, {
        width: w + 'px', height: h + 'px',          // תופסת בשורה בדיוק את המקום של האות הרגילה
        fontSize: fs * BIG + 'px', lineHeight: h * BIG + 'px',
        transform: `scale(${1 / BIG})`,             // מוקטנת חזרה לגודל הרגיל
      });
    });
  }
  // מצב של האות: הזזה, הטיה וגודל ביחס לאות הרגילה (1 = רגיל).
  // ty שומר את קו הבסיס במקום: האות גדלה כלפי מעלה, לא לשני הכיוונים
  const pose = (l, sx, sy, lift = 0, tilt = 0) => {
    const ty = 0.35 * box.get(l).h * (1 - sy) - lift;
    return `translateY(${ty}px) rotate(${tilt}deg) scale(${sx / BIG}, ${sy / BIG})`;
  };

  // למי שביקש פחות תנועה: אותו רצף, לאט יותר
  const slow = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1.7 : 1;
  const ms = (s) => s * 1000 * slow;

  // כל האנימציות שרצות עכשיו, כדי לעצור אותן כשהעכבר על הפס
  const running = new Set();
  const run = (el, frames, options) => {
    const anim = el.animate(frames, { fill: 'forwards', ...options });
    running.add(anim);
    anim.finished.then(() => running.delete(anim), () => running.delete(anim));
    return anim.finished.catch(() => {});
  };
  line.addEventListener('mouseenter', () => running.forEach(a => a.pause()));
  line.addEventListener('mouseleave', () => running.forEach(a => a.play()));

  const move = (from, to, duration, easing = 'linear') =>
    run(track, [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration, easing });

  async function cycle() {
    letters.forEach(l => l.getAnimations().forEach(a => a.cancel()));
    const lineW = line.offsetWidth, textW = track.offsetWidth;
    const start = lineW;                  // מחוץ לפס מימין
    const center = (lineW - textW) / 2;   // באמצע
    const out = -textW;                   // מחוץ לפס משמאל

    // 1) נכנס מימין עד האמצע, במהירות קבועה
    await move(start, center, ms(4));

    // 1.5) נפתח רווח שווה בין כל שתי אותיות, אות אחרי אות, והטקסט נשאר ממורכז.
    //      משתמשים ב-translate, שנפרד מה-transform של הגל, ולכן שניהם עובדים יחד
    const GAP = 7;          // כמה פיקסלים נוספים בין כל שתי אותיות
    const STEP = 0.012;     // הזמן בין אות לאות בפתיחה ובסגירה
    const n = letters.length;
    // הטקסט כתוב מימין לשמאל, ולכן האות הראשונה בסדר הקריאה היא הימנית: היא זזה ימינה, האחרונה שמאלה
    const dx = new Map(letters.map((l, i) => [l, ((n - 1) / 2 - i) * GAP]));
    // תיקון קטן: האותיות בקצוות ברוחב שונה, ולכן ממרכזים לפי הקצוות האמיתיים
    const edgeL = Math.min(...letters.map(l => l.offsetLeft + dx.get(l)));
    const edgeR = Math.max(...letters.map(l => l.offsetLeft + l.offsetWidth + dx.get(l)));
    const fix = textW / 2 - (edgeL + edgeR) / 2;
    letters.forEach(l => dx.set(l, dx.get(l) + fix));
    letters.forEach((l, i) => run(l, [{ translate: '0 0' }, { translate: `${dx.get(l)}px 0` }],
      { duration: ms(0.3), delay: ms(i * STEP), easing: 'cubic-bezier(.2,.8,.3,1)' }));
    await new Promise(r => setTimeout(r, ms(0.3 + n * STEP)));

    // 2) גל: כל אות בתורה קופצת החוצה מהפס, גדלה ומתעבה, ונוחתת חזרה.
    //    הקפיצה: עלייה, נפילה, מעיכה בנחיתה, ואז overshoot (נמתחת לגובה) ומתייצבת.
    //    האות הבאה יוצאת לפני שהקודמת נחתה: כשאות בשיא, השכנה באמצע העלייה, וזו שאחריה עוד לא זזה.
    //    הנקודות (•) לא קופצות
    //    העובי נוצר מצל באותו צבע ב-4 כיוונים, ביחידות של האות הגדולה. Rubik כבר שמן, אז מעבים רק קצת
    const thin = '0 0 0 currentColor, 0 0 0 currentColor, 0 0 0 currentColor, 0 0 0 currentColor';
    const heavy = '1.6px 0 0 currentColor, -1.6px 0 0 currentColor, 0 1.6px 0 currentColor, 0 -1.6px 0 currentColor';
    const up = 0.1, down = 0.08, squash = 0.06, stretch = 0.06, settle = 0.06;
    const pulse = up + down + squash + stretch + settle;
    const wave = 0.08;   // הזמן בין אות לאות, מעט פחות מהעלייה
    const at = (t) => t / pulse;
    let k = 0, last;
    for (const l of letters) {
      if (l.textContent === '•') continue;
      const tilt = (k++ % 2 ? 7 : -7);   // כל אות נוטה לצד אחר באוויר
      l.style.zIndex = 1000 - k;          // האות שבשיא תמיד מעל השכנות שלה
      last = run(l, [
        { textShadow: thin,  transform: pose(l, 1, 1), easing: 'cubic-bezier(.2,.8,.3,1)' },                                  // יורה למעלה
        { textShadow: heavy, transform: pose(l, BIG, BIG, 16, tilt), offset: at(up), easing: 'cubic-bezier(.6,0,1,1)' },      // שיא: גודל אמיתי, חדה. ומיד נופלת
        { textShadow: thin,  transform: pose(l, 1.3, 0.75), offset: at(up + down), easing: 'ease-out' },               // נמעכת
        { textShadow: thin,  transform: pose(l, 0.9, 1.15), offset: at(up + down + squash), easing: 'ease-in-out' },   // overshoot: נמתחת לגובה
        { textShadow: thin,  transform: pose(l, 1, 1) },                                                                     // מתייצבת
      ], { duration: ms(pulse), fill: 'none' });
      await new Promise(r => setTimeout(r, ms(wave)));   // האות הבאה יוצאת כבר עכשיו, כשהקודמת עוד עולה
    }
    await last;

    // 2.5) הריווח חוזר לרגיל, עם overshoot: האותיות נצמדות קצת יותר מהרגיל, ואז חוזרות למקום
    await Promise.all(letters.map((l, i) => run(l, [
      { translate: `${dx.get(l)}px 0` },
      { translate: `${-dx.get(l) * 0.15}px 0`, offset: 0.55, easing: 'ease-in-out' },   // overshoot: נצמדות מעבר לרגיל
      { translate: '0 0' },
    ], { duration: ms(0.5), delay: ms(i * STEP), easing: 'cubic-bezier(.5,0,.3,1)' })));

    // 3) עומד 3 שניות
    await run(track, [{ transform: `translateX(${center}px)` }, { transform: `translateX(${center}px)` }], { duration: ms(3) });

    // 4) תנופה: נסוג 40px ימינה
    await move(center, center + 40, ms(0.45), 'ease-in-out');

    // 5) יורה החוצה שמאלה, מהר
    await move(center + 40, out, ms(1.1), 'ease-in');

    // 6) מחכה רגע מחוץ לפס, ומתחיל מחדש
    await run(track, [{ transform: `translateX(${out}px)` }, { transform: `translateX(${out}px)` }], { duration: ms(1.2) });
    cycle();
  }

  // מחכים לגופן, כדי שהמידות של האותיות יהיו נכונות
  document.fonts.ready.then(() => { drawBig(); cycle(); });
})();
