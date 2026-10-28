const canvas = document.querySelector('.pattern');
const ctx = canvas.getContext('2d');

const W = 54;          // רוחב משולש
const H = 43.35;       // גובה שורה
const RADIUS = 250;    // כמה רחוק האפקט מגיע מהעכבר
const MAX = 0.8;       // הגודל הכי גדול (0 עד 1)

let mouse = { x: innerWidth * 0.8, y: innerHeight * 0.3 };
let pos = { x: mouse.x, y: mouse.y };

function resize() {
  const dpr = devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function draw() {
  // המרכז מתקרב לעכבר בהדרגה, כדי שהתנועה תהיה חלקה
  pos.x += (mouse.x - pos.x) * 0.1;
  pos.y += (mouse.y - pos.y) * 0.1;

  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = '#1e1e1e';

  for (let row = 0; row * H < innerHeight + H; row++) {
    const top = row * H;
    for (let col = 0; col * (W / 2) < innerWidth + W; col++) {
      const cx = col * (W / 2);
      const up = (row + col) % 2 === 0;
      const cy = up ? top + (2 * H) / 3 : top + H / 3;

      // ככל שהמשולש קרוב יותר לעכבר, הוא גדול יותר
      const distance = Math.hypot(cx - pos.x, cy - pos.y);
      const s = Math.max(0, 1 - distance / RADIUS) * MAX;
      if (s < 0.05) continue;

      const points = up
        ? [[cx, top], [cx + W / 2, top + H], [cx - W / 2, top + H]]
        : [[cx - W / 2, top], [cx + W / 2, top], [cx, top + H]];

      ctx.beginPath();
      for (const [x, y] of points) {
        ctx.lineTo(cx + (x - cx) * s, cy + (y - cy) * s);
      }
      ctx.fill();
    }
  }

  requestAnimationFrame(draw);
}
draw();