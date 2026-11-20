// カードの柄 24 種類。canvas に手続き的に描く。
// claude.ai の artifact「サブスクフォルダ」の描画コードをそのまま移植している。
import { inkFor, mixHex } from './color'
import {
  blurLayer, ctx2d, grain, hsl, hslRgb, lerp3, lowres, makeCanvas, pixels, ramp, rrect, vignette,
  type Noise,
} from './canvas'

export type DrawOpts = {
  color: string
  H: number
  S: number
  L: number
  r: () => number
  n: Noise
  k: number
}

export type Design = {
  id: string
  name: string
  tone: 'dark' | 'light' | 'auto'
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, o: DrawOpts): void
}

export const DESIGNS: Design[] = [
  { id:'thermal', name:'Thermal', tone:'dark', draw(ctx, w, h, o){
    const { r, k, H } = o;
    const f = makeCanvas(w, h), fx = ctx2d(f);
    fx.fillStyle = '#2a2a2a'; fx.fillRect(0, 0, w, h);
    const cx = w * (.3 + r() * .4), cy = h * (.3 + r() * .4), R = Math.max(w, h) * (.42 + r() * .18), n = 5 + (r() * 3 | 0), rot = r() * 6.283;
    blurLayer(fx, w, h, 15 * k, x => {
      for (let i = 0; i < n; i++){
        const a = rot + i / n * 6.283 + (r() - .5) * .35, len = R * (.8 + r() * .35);
        x.save(); x.translate(cx, cy); x.rotate(a);
        const g = x.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.55, 'rgba(170,170,170,.75)'); g.addColorStop(1, 'rgba(60,60,60,0)');
        x.fillStyle = g; x.beginPath(); x.ellipse(len * .48, 0, len * .52, len * (.17 + r() * .08), 0, 0, 6.283); x.fill(); x.restore();
      }
      const g2 = x.createRadialGradient(cx, cy, 0, cx, cy, R * .32);
      g2.addColorStop(0, '#fff'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g2; x.fillRect(-w, -h, w * 3, h * 3);
    });
    const lut = ramp([[0, hslRgb(H, 75, 8)], [.16, hslRgb(H, 85, 30)], [.3, [18, 90, 255]], [.42, [0, 210, 255]], [.53, [60, 255, 150]], [.63, [255, 240, 70]], [.75, [255, 140, 30]], [.87, [255, 40, 110]], [1, [255, 240, 235]]]);
    const img = fx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4){ const v = d[i] * 3; d[i] = lut[v]; d[i + 1] = lut[v + 1]; d[i + 2] = lut[v + 2]; }
    ctx.putImageData(img, 0, 0);
    grain(ctx, w, h, 10, r);
  }},
  { id:'xray', name:'X-ray', tone:'light', draw(ctx, w, h, o){
    const { r, k, H, S } = o;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, hsl(H, Math.min(S, 12), 93)); g.addColorStop(1, hsl(H, Math.min(S, 10), 80));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const cx = w * (.35 + r() * .3), cy = h * (.35 + r() * .3), n = 5 + (r() * 2 | 0), L = Math.max(w, h) * (.36 + r() * .12), rot = r() * 6.283;
    ctx.globalCompositeOperation = 'multiply';
    blurLayer(ctx, w, h, 2.5 * k, x => {
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++){
        const a = rot + i / n * 6.283 + (r() - .5) * .25 + pass * .32, len = L * (.85 + r() * .3) * (pass ? .68 : 1), wd = len * .2, bend = (r() - .5) * len * .14;
        x.save(); x.translate(cx, cy); x.rotate(a);
        const gg = x.createLinearGradient(0, 0, len, 0);
        gg.addColorStop(0, 'rgba(18,18,22,.8)'); gg.addColorStop(.6, 'rgba(40,40,46,.5)'); gg.addColorStop(1, 'rgba(60,60,66,.22)');
        x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(len * .3, -wd + bend, len * .72, -wd * .7 + bend, len, bend * .6); x.bezierCurveTo(len * .72, wd * .7 + bend, len * .3, wd + bend, 0, 0);
        x.fillStyle = gg; x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1.4 * k; x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = .9 * k; x.beginPath(); x.moveTo(len * .05, 0); x.quadraticCurveTo(len * .5, bend * .5, len * .9, bend * .55); x.stroke();
        x.restore();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, L * .15);
    cg.addColorStop(0, 'rgba(10,10,12,.9)'); cg.addColorStop(1, 'rgba(10,10,12,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, L * .15, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 16; i++){ const a = r() * 6.283, d = r() * L * .07; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, (.8 + r() * 1.2) * k, 0, 6.283); ctx.fill(); }
    grain(ctx, w, h, 14, r);
  }},
  { id:'petal', name:'Petal', tone:'dark', draw(ctx, w, h, o){
    const { r, k, H, S } = o, s = Math.max(S, 45);
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, hsl(H - 6, s, 20)); g.addColorStop(1, hsl(H + 8, s, 42));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const lobes = Array.from({ length:5 }, () => ({ x:w * (-.1 + r() * 1.2), y:h * (-.1 + r() * 1.2), rx:w * (.35 + r() * .3), ry:h * (.3 + r() * .35), a:r() * 3.14, lt:55 + r() * 30, a0:1.05 + r() * .2, a1:1.7 + r() * .25 }));
    blurLayer(ctx, w, h, 8 * k, x => {
      lobes.forEach(L => {
        x.save(); x.translate(L.x, L.y); x.rotate(L.a);
        const gg = x.createRadialGradient(L.rx * .35, -L.ry * .3, 0, 0, 0, Math.max(L.rx, L.ry));
        gg.addColorStop(0, hsl(H + 10, s + 15, L.lt + 12, .95)); gg.addColorStop(.5, hsl(H, s + 10, L.lt - 12, .92)); gg.addColorStop(1, hsl(H - 8, s, 16, .9));
        x.fillStyle = gg; x.beginPath(); x.ellipse(0, 0, L.rx, L.ry, 0, 0, 6.283); x.fill(); x.restore();
      });
    });
    ctx.globalCompositeOperation = 'screen';
    blurLayer(ctx, w, h, 2.5 * k, x => {
      lobes.forEach(L => { x.save(); x.translate(L.x, L.y); x.rotate(L.a); x.strokeStyle = hsl(H + 15, 60, 88, .38); x.lineWidth = 2.2 * k; x.beginPath(); x.ellipse(0, 0, L.rx, L.ry, 0, Math.PI * L.a0, Math.PI * L.a1); x.stroke(); x.restore(); });
    });
    ctx.globalCompositeOperation = 'source-over';
    vignette(ctx, w, h, .3); grain(ctx, w, h, 8, r);
  }},
  { id:'bloom', name:'Bokeh', tone:'dark', draw(ctx, w, h, o){
    const { r, k, H, S } = o, s = Math.max(S, 42);
    const g = ctx.createRadialGradient(w * .3, h * .3, 0, w * .5, h * .5, w * .8);
    g.addColorStop(0, hsl(H, s * .8, 22)); g.addColorStop(1, hsl(H + 20, s * .6, 6));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    blurLayer(ctx, w, h, 14 * k, x => { for (let i = 0; i < 14; i++){ x.fillStyle = hsl(H + (r() - .5) * 70, s + 20, 50 + r() * 20, .16 + r() * .24); x.beginPath(); x.arc(r() * w, r() * h, (30 + r() * 60) * k, 0, 6.283); x.fill(); } });
    blurLayer(ctx, w, h, 1.6 * k, x => {
      for (let i = 0; i < 26; i++){
        const R = (6 + r() * 22) * k, X = r() * w, Y = r() * h;
        x.fillStyle = hsl(H + (r() - .5) * 90, s + 30, 60 + r() * 25, .12 + r() * .22); x.beginPath(); x.arc(X, Y, R, 0, 6.283); x.fill();
        x.strokeStyle = hsl(H, 40, 85, .2); x.lineWidth = 1.2 * k; x.stroke();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
    grain(ctx, w, h, 8, r);
  }},
  { id:'aurora', name:'Aurora', tone:'dark', draw(ctx, w, h, o){
    const { r, k, H } = o;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#03040c'); g.addColorStop(1, hsl(H, 40, 13));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 80; i++){ ctx.globalAlpha = .2 + r() * .6; const sz = k * (r() < .9 ? 1 : 2); ctx.fillRect(r() * w, r() * h * .75, sz, sz); }
    ctx.globalAlpha = 1;
    const hues = [H + 140, H + 180, H + 250, H + 100];
    ctx.globalCompositeOperation = 'lighter';
    blurLayer(ctx, w, h, 24 * k, x => {
      for (let b = 0; b < 4; b++){
        const y0 = h * (.25 + r() * .45), amp = h * (.12 + r() * .15), ph = r() * 6.283, fr = 1 + r() * 1.5;
        x.strokeStyle = hsl(hues[b], 85, 55, .55); x.lineWidth = (30 + r() * 50) * k; x.lineCap = 'round';
        x.beginPath();
        for (let i = 0; i <= 40; i++){ const t = i / 40, X = -w * .1 + t * w * 1.2, Y = y0 + Math.sin(t * 6.283 * fr + ph) * amp; if (i) x.lineTo(X, Y); else x.moveTo(X, Y); }
        x.stroke();
      }
    });
    blurLayer(ctx, w, h, 6 * k, x => { for (let i = 0; i < 70; i++){ x.fillStyle = hsl(hues[i % 3], 90, 70, .025 + r() * .04); x.fillRect(r() * w, h * (.05 + r() * .15), (2 + r() * 8) * k, h * (.5 + r() * .3)); } });
    ctx.globalCompositeOperation = 'source-over';
    grain(ctx, w, h, 8, r);
  }},
  { id:'liquid', name:'Liquid', tone:'auto', draw(ctx, w, h, o){
    const { r, n, H, S } = o, s = Math.max(S, 32);
    const lut = ramp([[0, hslRgb(H, s, 14)], [.35, hslRgb(H + 18, s + 10, 42)], [.6, hslRgb(H - 12, s * .6, 74)], [.8, hslRgb(H + 30, 30, 92)], [1, hslRgb(H, s, 30)]]);
    const ox = r() * 50, oy = r() * 50, fq = 2.2 + r() * 1.2;
    lowres(ctx, w, h, 2, (x, y, out) => {
      const nx = x / w * fq + ox, ny = y / w * fq + oy;
      const q = n.fbm(nx, ny, 3), q2 = n.fbm(nx + 5.2 + q * 2.2, ny + 1.3 + q * 2.2, 3);
      const t = (Math.sin((nx + q2 * 4.2) * 2.6) + 1) / 2, i = (t * 255 | 0) * 3;
      out[0] = lut[i]; out[1] = lut[i + 1]; out[2] = lut[i + 2];
    });
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 6, r);
  }},
  { id:'holo', name:'Hologram', tone:'light', draw(ctx, w, h, o){
    const { r, k, H } = o;
    const cx = w * (.2 + r() * .6), cy = h * (.2 + r() * .6), a0 = r() * 6.283;
    let g;
    if (ctx.createConicGradient){ g = ctx.createConicGradient(a0, cx, cy); for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, hsl(H + i * 45, 75, 80)); }
    else { g = ctx.createLinearGradient(0, 0, w, h); for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, hsl(H + i * 60, 75, 80)); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    blurLayer(ctx, w, h, 18 * k, x => { x.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 5; i++){ x.beginPath(); x.ellipse(r() * w, r() * h, (40 + r() * 80) * k, (12 + r() * 30) * k, r() * 3, 0, 6.283); x.fill(); } });
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.rotate(-.5);
    for (let i = -h; i < w * 1.6; i += 7 * k){ ctx.fillStyle = `rgba(255,255,255,${.06 + r() * .1})`; ctx.fillRect(i, -h, 3 * k, h * 3); }
    ctx.restore();
    ctx.globalCompositeOperation = 'soft-light';
    const lg = ctx.createLinearGradient(0, h, w, 0); lg.addColorStop(0, hsl(H, 70, 40, .5)); lg.addColorStop(1, 'rgba(255,255,255,.5)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    grain(ctx, w, h, 8, r);
  }},
  { id:'chrome', name:'Chrome', tone:'dark', draw(ctx, w, h, o){
    const { r, n, H, S } = o;
    const tint = hslRgb(H, Math.min(60, S), 55), tA = S > 12 ? .18 : 0;
    const stops: Array<[number, number[]]> = [[0, [30, 32, 36]], [.16, [214, 219, 226]], [.28, [96, 101, 110]], [.42, [246, 248, 251]], [.52, [52, 55, 62]], [.68, [170, 176, 186]], [.82, [24, 26, 30]], [1, [140, 146, 156]]];
    const lut = ramp(stops.map(([t, c]) => [t, c.map((v, i) => v * (1 - tA) + tint[i] * tA)] as [number, number[]]));
    const ph = r() * 6.283, ox = r() * 40, amp = .08 + r() * .08, fr = 1 + r() * 1.2;
    pixels(ctx, w, h, (x, y, out) => {
      const u = x / w, v = y / h;
      const t = v + Math.sin(u * 6.283 * fr + ph) * amp + (n.fbm(u * 2.5 + ox, v * 2.5, 2) - .5) * .35;
      const i = ((t - Math.floor(t)) * 255 | 0) * 3;
      out[0] = lut[i]; out[1] = lut[i + 1]; out[2] = lut[i + 2];
    });
    grain(ctx, w, h, 5, r);
  }},
  { id:'riso', name:'Riso', tone:'auto', draw(ctx, w, h, o){
    const { r, k, H, S } = o, s = Math.max(S, 50);
    const g = ctx.createLinearGradient(0, h * r(), w, h * r());
    g.addColorStop(0, hsl(H, s + 10, 52)); g.addColorStop(1, hsl(H + 40 + r() * 30, s + 20, 64));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply';
    blurLayer(ctx, w, h, 5 * k, x => { x.fillStyle = hsl(H - 30, s, 46, .85); x.beginPath(); x.arc(w * (.3 + r() * .4), h * (.3 + r() * .5), h * (.35 + r() * .2), 0, 6.283); x.fill(); });
    blurLayer(ctx, w, h, 3 * k, x => { x.fillStyle = hsl(H + 160, 50, 60, .6); x.fillRect(w * r() * .6, h * (.55 + r() * .2), w * (.3 + r() * .3), h * .5); });
    ctx.globalCompositeOperation = 'source-over';
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4){ const v = (r() - .5) * 64; d[i] += v; d[i + 1] += v * .9; d[i + 2] += v * .8; }
    ctx.putImageData(img, 0, 0);
  }},
  { id:'sunset', name:'Sunset', tone:'dark', draw(ctx, w, h, o){
    const { r, k, H } = o, hz = h * (.6 + r() * .12);
    const g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, hsl(H - 30, 55, 18)); g.addColorStop(.6, hsl(H + 5, 70, 48)); g.addColorStop(1, hsl(H + 35, 92, 70));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz);
    const sx = w * (.3 + r() * .4), sr = h * (.13 + r() * .06);
    ctx.globalCompositeOperation = 'lighter';
    blurLayer(ctx, w, h, 28 * k, x => { x.fillStyle = hsl(H + 40, 100, 70, .8); x.beginPath(); x.arc(sx, hz, sr * 2.6, 0, 6.283); x.fill(); });
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = hsl(H + 50, 100, 92); ctx.beginPath(); ctx.arc(sx, hz, sr, Math.PI, 0); ctx.fill();
    const sg = ctx.createLinearGradient(0, hz, 0, h); sg.addColorStop(0, hsl(H + 10, 60, 30)); sg.addColorStop(1, hsl(H - 20, 50, 10));
    ctx.fillStyle = sg; ctx.fillRect(0, hz, w, h - hz);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++){
      const yy = hz + 3 * k + Math.pow(r(), 1.6) * (h - hz), ww = (1 - (yy - hz) / (h - hz)) * sr * 2.4 * (.4 + r());
      ctx.fillStyle = hsl(H + 45, 100, 80, .35 * r()); ctx.fillRect(sx - ww / 2 + (r() - .5) * sr, yy, ww, (1 + r() * 2) * k);
    }
    ctx.globalCompositeOperation = 'source-over';
    grain(ctx, w, h, 14, r);
  }},
  { id:'topo', name:'Contour', tone:'auto', draw(ctx, w, h, o){
    const { r, n, H, S, L } = o, s = Math.max(S, 25);
    const c0 = hslRgb(H, s, Math.max(18, L - 18)), c1 = hslRgb(H + 15, s, Math.min(70, L + 14));
    const lineC = L > 62 ? [30, 30, 34] : [255, 255, 255];
    const ox = r() * 30, oy = r() * 30, lv = 11 + r() * 5, tmp = [0, 0, 0];
    pixels(ctx, w, h, (x, y, out) => {
      const e = n.fbm(x / w * 2 + ox, y / w * 2 + oy, 3);
      lerp3(c0, c1, x / w * .6 + y / h * .4, tmp);
      const f = e * lv, fr = f - Math.floor(f), dd = Math.min(fr, 1 - fr);
      const major = Math.round(f) % 5 === 0, wd = major ? .085 : .045;
      const a = dd < wd ? (1 - dd / wd) * (major ? .75 : .45) : 0;
      lerp3(tmp, lineC, a, out);
    });
    grain(ctx, w, h, 6, r);
  }},
  { id:'mesh', name:'Mesh', tone:'auto', draw(ctx, w, h, o){
    const { r, k, H, S, L } = o, s = Math.max(S, 45);
    ctx.fillStyle = hsl(H, s, Math.max(35, Math.min(60, L))); ctx.fillRect(0, 0, w, h);
    blurLayer(ctx, w, h, 38 * k, x => {
      const hs = [H, H + 35, H - 40, H + 160, H + 70];
      for (let i = 0; i < 6; i++){ x.fillStyle = hsl(hs[i % hs.length] + (r() - .5) * 20, s + 15, 40 + r() * 40, .9); x.beginPath(); x.ellipse(r() * w, r() * h, (60 + r() * 110) * k, (50 + r() * 90) * k, r() * 3, 0, 6.283); x.fill(); }
    });
    grain(ctx, w, h, 7, r);
  }},
  { id:'washi', name:'Washi', tone:'light', draw(ctx, w, h, o){
    const { r, k, H, S, L } = o;
    ctx.fillStyle = hsl(H, Math.min(S, 18) * .5 + 8, 92); ctx.fillRect(0, 0, w, h);
    blurLayer(ctx, w, h, 22 * k, x => { for (let i = 0; i < 4; i++){ x.fillStyle = hsl(H, Math.max(S, 30), 60, .08 + r() * .08); x.beginPath(); x.arc(r() * w, r() * h, (40 + r() * 90) * k, 0, 6.283); x.fill(); } });
    const y = h * (.35 + r() * .3), p = [w * (.08 + r() * .1), y + (r() - .5) * h * .2, w * .35, y - h * .25 * r(), w * .6, y + h * .25 * r(), w * (.82 + r() * .1), y + (r() - .5) * h * .2];
    const bw = (18 + r() * 20) * k, ink = hsl(H, Math.max(S, 35), Math.min(42, L), .88);
    blurLayer(ctx, w, h, 1 * k, x => {
      x.strokeStyle = ink; x.lineCap = 'round'; x.lineWidth = bw * .8;
      x.beginPath(); x.moveTo(p[0], p[1]); x.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]); x.stroke();
      for (let i = 0; i < 34; i++){
        const dy = (r() - .5) * bw; x.lineWidth = (.6 + r() * 1.8) * k; x.globalAlpha = .35 + r() * .4;
        x.beginPath(); x.moveTo(p[0] + r() * 10 * k, p[1] + dy); x.bezierCurveTo(p[2], p[3] + dy, p[4], p[5] + dy, p[6] + r() * 30 * k, p[7] + dy * 1.2); x.stroke();
      }
      x.globalAlpha = 1;
    });
    ctx.lineWidth = .5 * k;
    for (let i = 0; i < 240; i++){
      const X = r() * w, Y = r() * h, a = r() * 6.283, len = (8 + r() * 34) * k;
      ctx.strokeStyle = `rgba(120,108,92,${.06 + r() * .14})`;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + Math.cos(a + 1) * len * .5, Y + Math.sin(a + 1) * len * .5, X + Math.cos(a) * len, Y + Math.sin(a) * len); ctx.stroke();
    }
    grain(ctx, w, h, 10, r);
  }},
  { id:'wave', name:'Wave', tone:'auto', draw(ctx, w, h, o){
    const { r, H, S, L } = o, s = Math.max(S, 40);
    const A = hslRgb(H, s, Math.max(25, Math.min(52, L))), B = hslRgb(H + 25, 30, 94);
    const fq = 13 + r() * 8, p1 = r() * 6, p2 = r() * 6, a1 = 1.2 + r() * 1.2;
    pixels(ctx, w, h, (x, y, out) => {
      const u = x / w, v = y / h;
      const t = v * fq + Math.sin(u * 5.2 + p1 + v * 2.4) * a1 + Math.sin(u * 12 + p2) * .35;
      const fr = t - Math.floor(t), e = Math.min(1, Math.max(0, (Math.abs(fr - .5) - .22) / .07 + .5));
      lerp3(A, B, e, out);
    });
  }},
  { id:'halftone', name:'Halftone', tone:'light', draw(ctx, w, h, o){
    const { r, k, H, S } = o, s = Math.max(S, 45), sp = 9 * k, D = Math.hypot(w, h);
    ctx.fillStyle = '#F1ECE2'; ctx.fillRect(0, 0, w, h);
    const layer = (col: string, ang: number, cx: number, cy: number) => {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.translate(w / 2, h / 2); ctx.rotate(ang);
      const c = Math.cos(ang), sn = Math.sin(ang);
      for (let yy = -D / 2; yy < D / 2; yy += sp) for (let xx = -D / 2; xx < D / 2; xx += sp){
        const gx = xx * c - yy * sn + w / 2, gy = xx * sn + yy * c + h / 2;
        const rad = sp * .52 * Math.max(0, 1 - Math.hypot(gx - cx, gy - cy) / D * 1.5);
        if (rad > .3){ ctx.beginPath(); ctx.arc(xx, yy, rad, 0, 6.283); ctx.fill(); }
      }
      ctx.restore();
    };
    layer(hsl(H, s, 50), .26, w * r(), h * r());
    layer(hsl(H + 150, 60, 58), 1.1, w * r(), h * r());
    grain(ctx, w, h, 10, r);
  }},
  { id:'glass', name:'Glass', tone:'dark', draw(ctx, w, h, o){
    const { r, k, H, S } = o, s = Math.max(S, 50);
    const blobs = Array.from({ length:5 }, () => ({ x:r() * w, y:r() * h, rx:(50 + r() * 90) * k, ry:(40 + r() * 70) * k, a:r() * 3, c:hsl(H + (r() - .5) * 120, s + 20, 50 + r() * 15) }));
    const drawBlobs = (x: CanvasRenderingContext2D) => { x.fillStyle = hsl(H, s * .6, 12); x.fillRect(-w, -h, w * 3, h * 3); blobs.forEach(b => { x.fillStyle = b.c; x.beginPath(); x.ellipse(b.x, b.y, b.rx, b.ry, b.a, 0, 6.283); x.fill(); }); };
    blurLayer(ctx, w, h, 22 * k, drawBlobs);
    const count = 2 + (r() * 2 | 0);
    for (let i = 0; i < count; i++){
      const p = { x:w * r() * .6, y:h * r() * .55, w:w * (.3 + r() * .35), h:h * (.3 + r() * .35), rr:14 * k };
      ctx.save(); rrect(ctx, p.x, p.y, p.w, p.h, p.rr); ctx.clip();
      blurLayer(ctx, w, h, 46 * k, drawBlobs);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1 * k; rrect(ctx, p.x + .5, p.y + .5, p.w - 1, p.h - 1, p.rr); ctx.stroke();
    }
    grain(ctx, w, h, 6, r);
  }},
  { id:'smoke', name:'Smoke', tone:'dark', draw(ctx, w, h, o){
    const { r, n, H, S } = o, s = Math.max(S, 35);
    const lut = ramp([[0, [8, 8, 12]], [.35, hslRgb(H, s * .6, 16)], [.62, hslRgb(H + 10, s, 44)], [.85, hslRgb(H - 10, s * .5, 80)], [1, [250, 250, 252]]]);
    const ox = r() * 40, oy = r() * 40;
    lowres(ctx, w, h, 2, (x, y, out) => {
      const u = x / w * 2.4 + ox, v = y / w * 2.4 + oy;
      const q = n.fbm(u, v, 4), q2 = n.fbm(u + q * 3 + 1.7, v + q * 3 + 9.2, 4);
      const t = Math.pow(Math.max(0, Math.min(1, (q2 - .2) * 1.75)), 1.25), i = (t * 255 | 0) * 3;
      out[0] = lut[i]; out[1] = lut[i + 1]; out[2] = lut[i + 2];
    });
    grain(ctx, w, h, 8, r);
  }},
  { id:'ripple', name:'Ripple', tone:'auto', draw(ctx, w, h, o){
    const { r, H, S, L } = o, s = Math.max(S, 30);
    const A = hslRgb(H, s, Math.max(20, L - 20)), B = hslRgb(H + 10, s * .8, Math.min(86, L + 30));
    const c1 = [w * r(), h * r()], c2 = [w * r(), h * r()], f = (.09 + r() * .05) * (520 / w);
    lowres(ctx, w, h, 2, (x, y, out) => {
      const d1 = Math.hypot(x - c1[0], y - c1[1]), d2 = Math.hypot(x - c2[0], y - c2[1]);
      const t = (Math.sin(d1 * f) + Math.sin(d2 * f * .8) + 2) / 4;
      lerp3(A, B, t * t * (3 - 2 * t), out);
    });
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 6, r);
  }},
  { id:'prism', name:'Prism', tone:'dark', draw(ctx, w, h, o){
    const { r, k, H } = o;
    ctx.fillStyle = hsl(H, 30, 5); ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    blurLayer(ctx, w, h, 16 * k, x => {
      for (let b = 0; b < 4; b++){
        x.save(); x.translate(w * r(), h * r()); x.rotate(-.9 + r() * .6);
        const bw = (40 + r() * 70) * k, g = x.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, hsl(H + i * 50, 100, 55, .55));
        x.fillStyle = g; x.fillRect(-bw / 2, -h * 1.5, bw, h * 3); x.restore();
      }
    });
    blurLayer(ctx, w, h, 4 * k, x => { x.save(); x.translate(w * r(), h * r()); x.rotate(-.7); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(-2 * k, -h, 4 * k, h * 2); x.restore(); });
    ctx.globalCompositeOperation = 'source-over';
    grain(ctx, w, h, 12, r);
  }},
  { id:'nebula', name:'Nebula', tone:'dark', draw(ctx, w, h, o){
    const { r, n, k, H } = o;
    const ca = hslRgb(H, 80, 55), cb = hslRgb(H + 70, 75, 50), ox = r() * 40, oy = r() * 40;
    lowres(ctx, w, h, 2, (x, y, out) => {
      const u = x / w * 2 + ox, v = y / w * 2 + oy;
      const q = n.fbm(u, v, 4), q2 = n.fbm(u + q * 2.5, v + q * 2.5 + 3, 4);
      const ia = Math.max(0, q2 - .45) * 2.6, ib = Math.max(0, q - .5) * 2.4;
      out[0] = 4 + ca[0] * ia + cb[0] * ib * ib; out[1] = 4 + ca[1] * ia + cb[1] * ib * ib; out[2] = 10 + ca[2] * ia + cb[2] * ib * ib;
    });
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 170; i++){ ctx.globalAlpha = .15 + r() * .7; const sz = (r() < .92 ? .8 : 1.8) * k; ctx.fillRect(r() * w, r() * h, sz, sz); }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    blurLayer(ctx, w, h, 3 * k, x => { for (let i = 0; i < 4; i++){ const X = r() * w, Y = r() * h; x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(X, Y, 2.4 * k, 0, 6.283); x.fill(); x.fillRect(X - 9 * k, Y - .5 * k, 18 * k, k); x.fillRect(X - .5 * k, Y - 9 * k, k, 18 * k); } });
    ctx.globalCompositeOperation = 'source-over';
    grain(ctx, w, h, 6, r);
  }},
  { id:'bauhaus', name:'Bauhaus', tone:'light', draw(ctx, w, h, o){
    const { r, H, S } = o, s = Math.max(S, 45);
    ctx.fillStyle = '#EEE7DA'; ctx.fillRect(0, 0, w, h);
    const pal = [hsl(H, s, 46), hsl(H + 150, 55, 48), '#1E1E1E', '#D9A23A', hsl(H, s, 76)];
    const cw = w / 3, ch = h / 2;
    let last = -1;
    for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 3; gx++){
      if (r() < .18) continue;
      let ci = r() * pal.length | 0; if (ci === last) ci = (ci + 1) % pal.length; last = ci;
      const X = gx * cw, Y = gy * ch, t = r() * 6 | 0, rot = (r() * 4 | 0) * Math.PI / 2;
      ctx.save(); ctx.translate(X + cw / 2, Y + ch / 2); ctx.rotate(rot); ctx.fillStyle = pal[ci];
      const m = Math.min(cw, ch);
      ctx.beginPath();
      if (t === 0) ctx.arc(0, 0, m * .46, 0, 6.283);
      else if (t === 1) ctx.arc(0, m * .25, m * .5, Math.PI, 0);
      else if (t === 2){ ctx.moveTo(-m / 2, -m / 2); ctx.arc(-m / 2, -m / 2, m, 0, Math.PI / 2); ctx.closePath(); }
      else if (t === 3) ctx.rect(-m * .42, -m * .42, m * .84, m * .84);
      else if (t === 4){ ctx.moveTo(-m / 2, m / 2); ctx.lineTo(m / 2, m / 2); ctx.lineTo(-m / 2, -m / 2); ctx.closePath(); }
      else { for (let i = 0; i < 4; i++) ctx.rect(-m / 2, -m / 2 + i * m / 4, m, m / 8); }
      ctx.fill(); ctx.restore();
    }
    grain(ctx, w, h, 10, r);
  }},
  { id:'linen', name:'Minimal', tone:'auto', draw(ctx, w, h, o){
    const { r, k, color } = o;
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, mixHex(color, .14)); g.addColorStop(1, mixHex(color, -.16));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < h; i += 2 * k){ ctx.fillStyle = `rgba(255,255,255,${r() * .05})`; ctx.fillRect(0, i, w, k); }
    for (let i = 0; i < w; i += 2 * k){ ctx.fillStyle = `rgba(0,0,0,${r() * .05})`; ctx.fillRect(i, 0, k, h); }
    const R = h * (.7 + r() * .4), cx = w * (.75 + r() * .2), cy = h * (r() * .4);
    ctx.lineWidth = 1.2 * k;
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.arc(cx + 1.2 * k, cy + 1.2 * k, R, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
    grain(ctx, w, h, 6, r);
  }},
  { id:'neon', name:'Neon', tone:'dark', draw(ctx, w, h, o){
    const { r, k, H } = o;
    ctx.fillStyle = '#07070B'; ctx.fillRect(0, 0, w, h);
    const shapes = [];
    const p1 = new Path2D(); p1.arc(w * (.25 + r() * .5), h * (.35 + r() * .3), h * (.22 + r() * .12), r() * 3, r() * 3 + 3.6 + r() * 2); shapes.push(p1);
    const p2 = new Path2D(); const y0 = h * (.2 + r() * .6), amp = h * (.08 + r() * .1);
    for (let i = 0; i <= 30; i++){ const X = w * (.05 + i / 30 * .9), Y = y0 + Math.sin(i / 30 * 6.283 * (1 + r() * .05) * 1.5) * amp; if (i) p2.lineTo(X, Y); else p2.moveTo(X, Y); }
    shapes.push(p2);
    if (r() < .6){ const p3 = new Path2D(); const zx = w * r() * .5, zy = h * (.6 + r() * .25); p3.moveTo(zx, zy); for (let i = 1; i <= 5; i++) p3.lineTo(zx + i * 22 * k, zy + (i % 2 ? -16 : 0) * k); shapes.push(p3); }
    const cols = [H, H + 140, H + 60];
    ctx.globalCompositeOperation = 'lighter';
    shapes.forEach((p, i) => {
      const c = cols[i % cols.length];
      blurLayer(ctx, w, h, 14 * k, x => { x.strokeStyle = hsl(c, 100, 55, .9); x.lineWidth = 12 * k; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(p); });
      blurLayer(ctx, w, h, 3 * k, x => { x.strokeStyle = hsl(c, 100, 65, .9); x.lineWidth = 5 * k; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(p); });
      ctx.strokeStyle = hsl(c, 100, 93); ctx.lineWidth = 2 * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p);
    });
    ctx.globalCompositeOperation = 'source-over';
    grain(ctx, w, h, 8, r);
  }},
  { id:'marble', name:'Marble', tone:'light', draw(ctx, w, h, o){
    const { r, n, H, S } = o;
    const vein = S > 12 ? hslRgb(H, Math.min(S, 45), 36) : [70, 72, 78], gold = [196, 160, 92];
    const ox = r() * 30, oy = r() * 30, ang = r() * 3, ca = Math.cos(ang), sa = Math.sin(ang), tmp = [0, 0, 0];
    pixels(ctx, w, h, (x, y, out) => {
      const u = x / w * 3, v = y / w * 3, q = n.fbm(u + ox, v + oy, 4);
      const t = (u * ca + v * sa) * 1.6 + q * 5.5;
      const vv = Math.pow(1 - Math.abs(Math.sin(t * 3.14159)), 15) + Math.pow(1 - Math.abs(Math.sin(t * 3.14159)), 4) * .12;
      const g2 = Math.pow(1 - Math.abs(Math.sin((t * .5 + q * 2) * 3.14159)), 40);
      const b = 242 - q * 16; tmp[0] = b; tmp[1] = b; tmp[2] = b - 2;
      lerp3(tmp, vein, vv * .8, out);
      lerp3(out, gold, g2 * .7, out);
    });
    grain(ctx, w, h, 5, r);
  }}
];

export const DESIGN_MAP: Record<string, Design> = Object.fromEntries(DESIGNS.map((d) => [d.id, d]))

/** 柄の上に載せる文字を白系（dark）にするか黒系（light）にするか */
export function toneOf(design: string, color: string): 'dark' | 'light' {
  const t = (DESIGN_MAP[design] || DESIGNS[0]).tone
  return t === 'auto' ? (inkFor(color) === '#FFFFFF' ? 'dark' : 'light') : t
}
