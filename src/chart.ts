// Results chart: wpm and raw per second, with error markers. Plain canvas, redrawn on hover.

export interface Sample {
  wpm: number;
  raw: number;
  errors: number;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function drawChart(canvas: HTMLCanvasElement, data: Sample[], hover = -1): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const sub = css("--sub");
  const main = css("--main");
  const error = css("--error");
  const font = getComputedStyle(document.body).fontFamily;

  const padL = 34, padR = 34, padT = 10, padB = 22;
  const cw = w - padL - padR;
  const ch = h - padT - padB;
  const n = data.length;
  const maxY = Math.max(10, Math.ceil((Math.max(...data.map((d) => Math.max(d.wpm, d.raw)), 0) * 1.1) / 10) * 10);
  const maxE = Math.max(1, ...data.map((d) => d.errors));
  const x = (i: number) => padL + (n <= 1 ? cw / 2 : (i / (n - 1)) * cw);
  const y = (v: number) => padT + ch - (v / maxY) * ch;

  g.font = `11px ${font}`;
  g.textBaseline = "middle";
  g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const v = (maxY / 4) * k;
    g.strokeStyle = sub + "33";
    g.beginPath();
    g.moveTo(padL, Math.round(y(v)) + 0.5);
    g.lineTo(w - padR, Math.round(y(v)) + 0.5);
    g.stroke();
    g.fillStyle = sub;
    g.textAlign = "right";
    g.fillText(String(Math.round(v)), padL - 8, y(v));
  }
  g.textAlign = "left";
  for (let k = 0; k <= 3; k++) {
    const v = Math.round((maxE / 3) * k);
    g.fillText(String(v), w - padR + 8, padT + ch - (v / maxE) * ch);
  }
  g.textAlign = "center";
  g.textBaseline = "top";
  const step = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += step) g.fillText(String(i + 1), x(i), padT + ch + 8);

  const line = (key: "wpm" | "raw", color: string, width: number) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = "round";
    g.beginPath();
    data.forEach((d, i) => (i ? g.lineTo(x(i), y(d[key])) : g.moveTo(x(i), y(d[key]))));
    g.stroke();
  };
  if (n > 1) {
    const grad = g.createLinearGradient(0, padT, 0, padT + ch);
    grad.addColorStop(0, main + "30");
    grad.addColorStop(1, main + "00");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x(0), padT + ch);
    data.forEach((d, i) => g.lineTo(x(i), y(d.wpm)));
    g.lineTo(x(n - 1), padT + ch);
    g.fill();
  }
  line("raw", sub, 1.5);
  line("wpm", main, 2.5);

  g.strokeStyle = error;
  g.lineWidth = 2;
  data.forEach((d, i) => {
    if (!d.errors) return;
    const cx = x(i), cy = padT + ch - (d.errors / maxE) * ch, r = 3.5;
    g.beginPath();
    g.moveTo(cx - r, cy - r);
    g.lineTo(cx + r, cy + r);
    g.moveTo(cx + r, cy - r);
    g.lineTo(cx - r, cy + r);
    g.stroke();
  });

  if (hover >= 0 && hover < n) {
    g.strokeStyle = sub + "88";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(Math.round(x(hover)) + 0.5, padT);
    g.lineTo(Math.round(x(hover)) + 0.5, padT + ch);
    g.stroke();
    g.fillStyle = main;
    g.beginPath();
    g.arc(x(hover), y(data[hover].wpm), 4, 0, Math.PI * 2);
    g.fill();
  }
}

/** Index of the second nearest to a mouse x position. */
export function hoverIndex(canvas: HTMLCanvasElement, clientX: number, n: number): number {
  const r = canvas.getBoundingClientRect();
  const cw = r.width - 68;
  if (n <= 1) return 0;
  return Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left - 34) / cw) * (n - 1))));
}
