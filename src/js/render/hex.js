import { view } from './canvas.js';

export function hexToPixel(q, r) {
    const s = view.hexR;
    return {
        x: s * (3 / 2 * q) + view.originX,
        y: s * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r) + view.originY
    };
}

export function pixelToHex(x, y) {
    const s = view.hexR;
    const px = (x - view.originX) / s;
    const py = (y - view.originY) / s;
    const q = 2 / 3 * px;
    const r = -1 / 3 * px + Math.sqrt(3) / 3 * py;
    return hexRound(q, r, -q - r);
}

function hexRound(q, r, s) {
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return { q: rq, r: rr };
}
