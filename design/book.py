#!/usr/bin/env python3
# Woven Arithmetic — Plates I–III
# One cloth, read three ways: coiled, flattened, stood on edge.

import math
import random
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.pagesizes import A2
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_DIR = ("/Users/irwansyah.yongky/Library/Application Support/Claude/"
            "local-agent-mode-sessions/skills-plugin/86c1afca-28cd-45b5-a595-f8615bc9e6cc/"
            "9d97b8fe-ca81-4c8b-8613-ecb87c422446/skills/canvas-design/canvas-fonts")

pdfmetrics.registerFont(TTFont("Display", f"{FONT_DIR}/Italiana-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Mono", f"{FONT_DIR}/GeistMono-Regular.ttf"))
pdfmetrics.registerFont(TTFont("SerifIt", f"{FONT_DIR}/InstrumentSerif-Italic.ttf"))

DIR = "/Users/irwansyah.yongky/Projects/hadiran-rt/design"

W, H = A2
ML = MR = 122.0
MT, MB = 118.0, 118.0

PAPER   = (0.9294, 0.9137, 0.8706)
INK     = (0.1059, 0.1373, 0.1216)
EMERALD = (0.1137, 0.4157, 0.2902)
GOLD    = (0.7059, 0.5294, 0.2275)
ROSE    = (0.6118, 0.2275, 0.2667)

N     = 69
WIND  = 6
SEG   = N * WIND      # 414
DONE  = 302
RECUR = 11
DEVI  = 196

# the one measured series, shared by every plate
_r = random.Random(4006)
BEBAN = []
for k in range(N):
    b = 22 + 46 * (0.5 + 0.5 * math.sin(k / N * math.pi * 2.4 + 0.6))
    BEBAN.append(0.0 if k in (7, 29, 44, 61) else max(0.0, b + _r.uniform(-5.0, 6.0)))

SERIES = []
for _b in range(WIND):
    _rb = random.Random(700 + _b)
    _row = []
    for k in range(N):
        v = BEBAN[k]
        if v == 0.0:
            v = 0.0 if _rb.random() < 0.72 else 26.0 + _rb.uniform(0.0, 12.0)
        else:
            v = v * _rb.uniform(0.80, 1.20)
            if _rb.random() < 0.05:
                v = 0.0
        _row.append(v)
    SERIES.append(_row)

c = None


# ── helpers ────────────────────────────────────────────────────────────────
def rgb(col, alpha=1.0, fill=False):
    if fill:
        c.setFillColorRGB(*col); c.setFillAlpha(alpha)
    else:
        c.setStrokeColorRGB(*col); c.setStrokeAlpha(alpha)


def tracked(x, y, s, font, size, tr=0.0, align="l", col=INK, alpha=1.0):
    w = pdfmetrics.stringWidth(s, font, size) + tr * (len(s) - 1)
    if align == "c":
        x -= w / 2.0
    elif align == "r":
        x -= w
    c.saveState()
    rgb(col, alpha, fill=True)
    t = c.beginText(x, y)
    t.setFont(font, size); t.setCharSpace(tr); t.setFillColorRGB(*col)
    t.textOut(s)
    c.drawText(t)
    c.restoreState()
    return w


def polyline(pts, close=False):
    p = c.beginPath()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    if close:
        p.close()
    c.drawPath(p, stroke=1, fill=0)


def diamond(x, y, s, filled, col, alpha=1.0, lw=0.6):
    p = c.beginPath()
    p.moveTo(x, y + s); p.lineTo(x + s, y); p.lineTo(x, y - s); p.lineTo(x - s, y)
    p.close()
    if filled:
        rgb(col, alpha, fill=True); c.setLineWidth(lw); rgb(col, alpha)
        c.drawPath(p, stroke=0, fill=1)
    else:
        c.setLineWidth(lw); rgb(col, alpha)
        c.drawPath(p, stroke=1, fill=0)


def ground(seed):
    c.setFillColorRGB(*PAPER)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    rnd = random.Random(seed)
    c.saveState()
    for _ in range(7000):
        c.setFillColorRGB(*INK); c.setFillAlpha(rnd.uniform(0.020, 0.055))
        c.circle(rnd.uniform(0, W), rnd.uniform(0, H), rnd.uniform(0.35, 1.05), stroke=0, fill=1)
    for _ in range(900):
        c.setFillColorRGB(1, 1, 1); c.setFillAlpha(rnd.uniform(0.05, 0.14))
        c.circle(rnd.uniform(0, W), rnd.uniform(0, H), rnd.uniform(0.4, 1.3), stroke=0, fill=1)
    c.restoreState()


def frame(plate, sub, scale, foot_left, foot_right):
    c.saveState()
    c.setLineWidth(0.7); rgb(INK, 0.85)
    c.line(ML, H - MT, W - MR, H - MT)
    c.setLineWidth(0.5); rgb(INK, 0.55)
    c.line(ML, MB, W - MR, MB)
    c.restoreState()
    tracked(ML, H - MT + 12, "STUDI PERPUTARAN", "Mono", 7.6, 3.6, alpha=0.9)
    tracked(W - MR, H - MT + 12, plate, "Mono", 7.6, 3.6, align="r", alpha=0.9)
    tracked(ML, H - MT - 20, sub, "Mono", 6.6, 2.6, alpha=0.52)
    tracked(W - MR, H - MT - 20, scale, "Mono", 6.6, 2.6, align="r", alpha=0.52)
    tracked(ML, MB - 22.0, foot_left, "Mono", 6.2, 2.4, alpha=0.38)
    tracked(W - MR, MB - 22.0, foot_right, "Mono", 6.2, 2.4, align="r", alpha=0.38)


def legend(right_note):
    LY = 300.0
    lx = ML
    for filled, col, lab in ((False, INK, "TERTUNDA"), (True, INK, "TERCATAT"),
                             (True, GOLD, "GILIRAN"), (False, ROSE, "SIMPANGAN")):
        diamond(lx + 4.0, LY + 2.2, 3.4, filled, col, 0.85 if filled else 0.65, lw=0.6)
        w = tracked(lx + 15.0, LY, lab, "Mono", 6.6, 2.4, alpha=0.62)
        lx += 15.0 + w + 34.0
    tracked(W - MR, LY, right_note, "Mono", 6.6, 2.6, align="r", alpha=0.45)
    c.saveState()
    c.setLineWidth(0.35); rgb(INK, 0.28)
    c.line(ML, LY - 26.0, W - MR, LY - 26.0)
    c.restoreState()


def signature(title, size, tr, line):
    tracked(ML, 196.0, title, "Display", size, tr, alpha=0.95)
    tracked(ML, 162.0, line, "SerifIt", 17.0, 0.4, alpha=0.62)
    tracked(W - MR, 196.0, "RT 004 / 006", "Mono", 7.0, 3.2, align="r", alpha=0.62)
    tracked(W - MR, 176.0, "MMXXVI", "Mono", 7.0, 3.2, align="r", alpha=0.40)


# ══ PLATE I — the coil ══════════════════════════════════════════════════════
def plate_i():
    CX, CY = W / 2.0, 1028.0
    R_IN, R_OUT = 74.0, 356.0
    R_HAIR, R_TICK0, R_TICK1, R_DIA, R_NUM = 368.0, 376.0, 391.0, 400.0, 421.0

    def ang(k):
        return math.pi / 2.0 - 2.0 * math.pi * k / N

    def pol(a, r):
        return CX + r * math.cos(a), CY + r * math.sin(a)

    def arc_pts(a0, a1, r0, r1, steps=14):
        return [pol(a0 + (a1 - a0) * i / steps, r0 + (r1 - r0) * i / steps)
                for i in range(steps + 1)]

    ground(69_006)
    frame("PLAT I", "69 SIMPUL  ·  6 PUTARAN  ·  414 TANDA", "SKALA 1 : 1",
          "TENUN — WARP 69 · WEFT 414", "PLAT I DARI VII")

    # warp
    c.saveState()
    c.setLineWidth(0.22)
    for k in range(N):
        a = ang(k); rgb(INK, 0.24)
        x0, y0 = pol(a, 62.0); x1, y1 = pol(a, R_HAIR - 5.0)
        c.line(x0, y0, x1, y1)
    c.restoreState()

    # weft
    gap = 0.115
    for i in range(SEG):
        k = i % N
        t0 = 2.0 * math.pi * WIND * (i + gap) / SEG
        t1 = 2.0 * math.pi * WIND * (i + 1 - gap) / SEG
        r0 = R_IN + (R_OUT - R_IN) * (i + gap) / SEG
        r1 = R_IN + (R_OUT - R_IN) * (i + 1 - gap) / SEG
        a0, a1 = math.pi / 2.0 - t0, math.pi / 2.0 - t1
        c.saveState()
        grow = i / SEG
        if i == DEVI:
            c.setLineWidth(2.1); rgb(ROSE, 0.95)
        elif k == RECUR:
            c.setLineWidth(1.5 + 1.4 * grow); rgb(GOLD, 0.95)
        elif i < DONE:
            c.setLineWidth(0.95 + 1.15 * grow); rgb(EMERALD, 0.93)
        else:
            c.setLineWidth(0.62); rgb(INK, 0.50)
        c.setLineCap(0)
        polyline(arc_pts(a0, a1, r0, r1))
        c.restoreState()

    # closing seam
    c.saveState()
    t = 2.0 * math.pi * WIND * DONE / SEG
    a = math.pi / 2.0 - t
    r = R_IN + (R_OUT - R_IN) * DONE / SEG
    c.setLineWidth(0.5); rgb(INK, 0.7)
    x0, y0 = pol(a, r - 11); x1, y1 = pol(a, r + 11)
    c.line(x0, y0, x1, y1)
    c.restoreState()

    c.saveState()
    c.setLineWidth(0.4); rgb(INK, 0.45)
    c.circle(CX, CY, R_HAIR, stroke=1, fill=0)
    c.setLineWidth(0.35); rgb(INK, 0.26)
    c.circle(CX, CY, 56.0, stroke=1, fill=0)
    c.restoreState()

    FILLED = 50
    for k in range(N):
        a = ang(k)
        long_tick = (k % 5 == 0)
        c.saveState()
        c.setLineWidth(0.7 if long_tick else 0.4)
        rgb(INK, 0.75 if long_tick else 0.42)
        x0, y0 = pol(a, R_TICK0 - (5.0 if long_tick else 0.0)); x1, y1 = pol(a, R_TICK1)
        c.line(x0, y0, x1, y1)
        c.restoreState()
        dx, dy = pol(a, R_DIA)
        if k == RECUR:
            diamond(dx, dy, 5.0, True, GOLD, 1.0)
        elif k == DEVI % N:
            diamond(dx, dy, 4.0, False, ROSE, 0.95, lw=0.9)
        elif k < FILLED:
            diamond(dx, dy, 3.4, True, INK, 0.82)
        else:
            diamond(dx, dy, 3.4, False, INK, 0.45, lw=0.5)

    for k, lab in ((0, "01"), (18, "18"), (35, "35"), (52, "52")):
        x, y = pol(ang(k), R_NUM)
        tracked(x, y - 2.6, lab, "Mono", 7.0, 1.4, align="c", alpha=0.70)

    c.saveState()
    c.setLineWidth(0.35); rgb(INK, 0.26)
    c.circle(CX, CY, 19.0, stroke=1, fill=0)
    c.restoreState()
    diamond(CX, CY, 6.0, False, INK, 0.55, lw=0.45)
    diamond(CX, CY, 2.3, True, GOLD, 0.95)

    def leader(k, r_start, out_r, side, label, col):
        a = ang(k)
        xs, ys = pol(a, r_start); xe, ye = pol(a, out_r)
        c.saveState()
        c.setLineWidth(0.35); rgb(col, 0.62)
        c.line(xs, ys, xe, ye)
        x_end = (W - MR) if side == "r" else ML
        c.setLineWidth(0.45); rgb(col, 0.88)
        c.line(xe, ye, x_end, ye)
        c.setFillColorRGB(*PAPER)
        c.circle(xs, ys, 3.4, stroke=1, fill=1)
        c.restoreState()
        tracked(x_end, ye + 7.0, label, "Mono", 6.8, 2.8,
                align=("r" if side == "r" else "l"), col=col, alpha=0.9)

    leader(RECUR, R_DIA + 6.0, R_DIA + 62.0, "r", "SIMPUL BERULANG · 06×", GOLD)
    leader(DEVI % N, R_IN + (R_OUT - R_IN) * DEVI / SEG, R_DIA + 44.0, "l",
           "SIMPANGAN TUNGGAL", ROSE)

    # ledger strip
    BASE = 384.0
    SW = W - ML - MR
    step = SW / (N - 1)
    tracked(ML, BASE + 118.0, "KOLOM 01—69", "Mono", 6.6, 2.6, alpha=0.55)
    tracked(W - MR, BASE + 118.0, "TINGGI = BEBAN", "Mono", 6.6, 2.6, align="r", alpha=0.55)
    c.saveState()
    c.setLineWidth(0.35); rgb(INK, 0.30)
    c.line(ML, BASE, W - MR, BASE)
    c.restoreState()
    for k in range(N):
        x = ML + step * k
        h = BEBAN[k]
        c.saveState()
        if k == RECUR:
            c.setLineWidth(2.4); rgb(GOLD, 0.95)
        elif k == DEVI % N:
            c.setLineWidth(1.8); rgb(ROSE, 0.92)
        elif h == 0.0:
            c.setLineWidth(0.5); rgb(INK, 0.32)
        else:
            c.setLineWidth(1.25); rgb(INK, 0.66)
        if h == 0.0:
            c.line(x, BASE, x, BASE + 7.0)
            diamond(x, BASE + 12.0, 2.0, False, INK, 0.4, lw=0.4)
        else:
            c.line(x, BASE, x, BASE + h)
        c.restoreState()

    c.saveState()
    tb, th = BASE - 13.0, 4.6
    tw = SW / (N * 2)
    for k in range(N * 2):
        x = ML + tw * k
        c.setLineWidth(0.4); rgb(GOLD, 0.48 if k % 2 == 0 else 0.20)
        polyline([(x, tb), (x + tw, tb), (x + tw / 2.0, tb - th)], close=True)
    c.restoreState()

    legend("PENGAMATAN BERLANJUT")
    signature("WOVEN ARITHMETIC", 50.0, 13.0, "setiap nama kembali, lingkarannya naik satu")


# ══ PLATE II — the cloth, flattened ════════════════════════════════════════
def plate_ii():
    COLS, ROWS, CELL = 18, 23, 46.0
    FX0 = (W - COLS * CELL) / 2.0
    FY1 = 1462.0                      # top edge of the field
    FX1 = FX0 + COLS * CELL
    FY0 = FY1 - ROWS * CELL           # 404

    ground(414_069)
    frame("PLAT II", "414 SEL  ·  18 × 23  ·  HAMPARAN", "SKALA 1 : 1",
          "TENUN — SEL 414 · LANGKAH 18", "PLAT II DARI VII")

    # loom lattice
    c.saveState()
    c.setLineWidth(0.2); rgb(INK, 0.15)
    for i in range(COLS + 1):
        x = FX0 + i * CELL
        c.line(x, FY0, x, FY1)
    for j in range(ROWS + 1):
        y = FY0 + j * CELL
        c.line(FX0, y, FX1, y)
    c.restoreState()

    BMAX = max(BEBAN)

    def cell_xy(i):
        col, row = i % COLS, i // COLS
        return FX0 + col * CELL + CELL / 2.0, FY1 - row * CELL - CELL / 2.0

    for i in range(SEG):
        k = i % N
        x, y = cell_xy(i)
        w = BEBAN[k] / BMAX
        sz = 1.6 + 5.0 * (w ** 1.8)
        if i == DEVI:
            diamond(x, y, 6.0, False, ROSE, 0.95, lw=1.0)
        elif k == RECUR:
            diamond(x, y, 6.8, True, GOLD, 0.98)
        elif BEBAN[k] == 0.0:
            diamond(x, y, 1.5, False, INK, 0.45 if i < DONE else 0.28, lw=0.45)
        elif i < DONE:
            diamond(x, y, sz, True, INK, 0.80)
        else:
            diamond(x, y, sz, False, INK, 0.42, lw=0.5)

    # closing seam — done / pending
    br, bc = DONE // COLS, DONE % COLS
    c.saveState()
    c.setLineWidth(0.6); rgb(INK, 0.72)
    y_lo = FY1 - (br + 1) * CELL
    y_hi = FY1 - br * CELL
    polyline([(FX0, y_lo), (FX0 + bc * CELL, y_lo),
              (FX0 + bc * CELL, y_hi), (FX1, y_hi)])
    c.restoreState()

    # marginal profiles
    row_sum = [sum(BEBAN[i % N] for i in range(r * COLS, (r + 1) * COLS) if i < DONE)
               for r in range(ROWS)]
    col_sum = [sum(BEBAN[(q * COLS + col) % N] for q in range(ROWS)) for col in range(COLS)]
    rmax = max(row_sum)
    cmin, cmax = min(col_sum), max(col_sum)

    c.saveState()
    for r in range(ROWS):
        y = FY1 - r * CELL - CELL / 2.0
        if row_sum[r] <= 0.0:
            continue
        c.setLineWidth(1.7); rgb(INK, 0.60)
        c.line(FX1 + 16.0, y, FX1 + 16.0 + 42.0 * row_sum[r] / rmax, y)
    for col in range(COLS):
        x = FX0 + col * CELL + CELL / 2.0
        v = 6.0 + 26.0 * (col_sum[col] - cmin) / (cmax - cmin)
        c.setLineWidth(1.7); rgb(INK, 0.60)
        c.line(x, FY0 - 16.0, x, FY0 - 16.0 - v)
    c.restoreState()

    for r in range(0, ROWS, 5):
        y = FY1 - r * CELL - CELL / 2.0
        tracked(FX0 - 16.0, y - 2.4, f"{r + 1:02d}", "Mono", 6.4, 1.6, align="r", alpha=0.55)
    tracked(FX0, FY1 + 18.0, "BARIS 01—23  ·  BESAR TANDA = BEBAN", "Mono", 6.6, 2.6, alpha=0.55)
    tracked(FX1, FY1 + 18.0, "BEBAN TERCATAT →", "Mono", 6.6, 2.6, align="r", alpha=0.45)
    tracked(FX0, FY0 - 62.0, "PROFIL LAJUR", "Mono", 6.4, 2.4, alpha=0.42)
    tracked(FX1, FY0 - 62.0, "SIMPUL BERULANG · HANYUT 3 SEL PER PUTARAN", "Mono", 6.4, 2.4,
            align="r", col=GOLD, alpha=0.75)

    legend("SATU KAIN, DIBUKA")
    signature("HAMPARAN", 44.0, 15.0, "lingkaran yang dipotong, lalu dibentangkan rata")


# ══ PLATE III — the section, stood on edge ═════════════════════════════════
def plate_iii():
    X0, X1 = ML + 42.0, W - MR
    step = (X1 - X0) / (N - 1)

    ground(303_069)
    frame("PLAT III", "6 PUTARAN  ·  POTONGAN TEGAK", "SKALA 1 : 1",
          "TENUN — PUTARAN I—VI", "PLAT III DARI VII")

    ROM = ("I", "II", "III", "IV", "V", "VI")
    bases = [1420.0 - b * 150.0 for b in range(WIND)]

    # the plumb — one thread, six returns
    xr = X0 + step * RECUR
    c.saveState()
    c.setLineWidth(0.5); rgb(GOLD, 0.35)
    c.setDash(2.0, 3.6)
    c.line(xr, bases[-1] - 26.0, xr, bases[0] + 62.0)
    c.restoreState()

    for b in range(WIND):
        base = bases[b]
        c.saveState()
        c.setLineWidth(0.35); rgb(INK, 0.32)
        c.line(X0 - 14.0, base, X1, base)
        c.restoreState()
        tracked(X0 - 26.0, base - 2.6, ROM[b], "Mono", 7.4, 2.0, align="r", alpha=0.62)

        for k in range(N):
            i = b * N + k
            x = X0 + step * k
            done = i < DONE
            val = SERIES[b][k]
            h = 7.0 + val * 0.46
            c.saveState()
            if i == DEVI:
                c.setLineWidth(1.9); rgb(ROSE, 0.92)
            elif k == RECUR:
                c.setLineWidth(2.2); rgb(GOLD, 0.95)
                h = 30.0 + 6.0 * b
            elif done:
                c.setLineWidth(1.15); rgb(EMERALD, 0.85)
            else:
                c.setLineWidth(0.55); rgb(INK, 0.40)
                h = 7.0 + val * 0.16
            c.line(x, base, x, base + h)
            c.restoreState()
        if b == WIND - 1:
            for k in range(0, N, 10):
                tracked(X0 + step * k, base - 20.0, f"{k + 1:02d}", "Mono", 6.2, 1.4,
                        align="c", alpha=0.50)
            tracked(X1, base - 20.0, "69", "Mono", 6.2, 1.4, align="c", alpha=0.50)

    tracked(X0 - 42.0 + 0.0, bases[0] + 76.0, "PUTARAN I—VI  ·  TINGGI = BEBAN",
            "Mono", 6.6, 2.6, alpha=0.55)
    tracked(X1, bases[0] + 76.0, "TEGAK LURUS PADA SIMPUL 12", "Mono", 6.6, 2.6,
            align="r", col=GOLD, alpha=0.72)

    # cumulative deviation — 414 steps around the mean
    CB, AMP = 452.0, 74.0
    flat = [SERIES[i // N][i % N] for i in range(SEG)]
    mean = sum(flat) / SEG
    walk, run = [], 0.0
    for v in flat:
        run += v - mean
        walk.append(run)
    span = max(abs(min(walk)), abs(max(walk)))
    pts = [(ML, CB)]
    for i, v in enumerate(walk):
        pts.append((ML + (W - ML - MR) * (i + 1) / SEG, CB + AMP * v / span))
    cut = DONE + 1
    c.saveState()
    c.setLineWidth(1.4); rgb(EMERALD, 0.90)
    polyline(pts[:cut])
    c.setLineWidth(0.6); rgb(INK, 0.45); c.setDash(2.0, 3.0)
    polyline(pts[cut - 1:])
    c.restoreState()
    c.saveState()
    c.setLineWidth(0.35); rgb(INK, 0.30)
    c.line(ML, CB, W - MR, CB)
    c.restoreState()
    for p in range(WIND):
        x, y = pts[RECUR + p * N + 1]
        diamond(x, y, 3.6, True, GOLD, 0.95)
    xd, yd = pts[DEVI + 1]
    diamond(xd, yd, 3.6, False, ROSE, 0.95, lw=0.9)

    tracked(ML, CB + AMP + 34.0, "SIMPANGAN KUMULATIF  ·  414 LANGKAH", "Mono", 6.6, 2.6, alpha=0.55)
    tracked(W - MR, CB + AMP + 34.0, "PUTUS = BELUM DITENUN", "Mono", 6.6, 2.6,
            align="r", alpha=0.45)
    tracked(ML - 10.0, CB - 2.4, "0", "Mono", 6.2, 0.0, align="r", alpha=0.45)

    legend("TIGA BACAAN, SATU HITUNGAN")
    signature("TEGAK LURUS", 44.0, 15.0, "yang berulang selalu jatuh di garis yang sama")


# ══ PLATE IV — the typology of knots ═══════════════════════════════════════
def plate_iv():
    COLS, ROWS = 9, 8
    CW = (W - ML - MR) / COLS
    CH = 132.0
    FY1 = 1462.0

    ground(690_414)
    frame("PLAT IV", "TIPOLOGI SIMPUL  ·  01—69", "SKALA 4 : 1",
          "TENUN — ENAM JARI-JARI PER SIMPUL", "PLAT IV DARI VII")

    vmax = max(max(row) for row in SERIES)
    R = 40.0

    for k in range(N):
        col, row = k % COLS, k // COLS
        cx = ML + col * CW + CW / 2.0
        cy = FY1 - row * CH - CH / 2.0 + 6.0

        c.saveState()
        c.setLineWidth(0.3); rgb(INK, 0.22)
        c.circle(cx, cy, R, stroke=1, fill=0)
        c.restoreState()

        for b in range(WIND):
            a = math.pi / 2.0 - 2.0 * math.pi * b / WIND
            v = SERIES[b][k]
            i = b * N + k
            done = i < DONE
            c.saveState()
            if v == 0.0:
                c.setLineWidth(0.4); rgb(INK, 0.30)
                x0, y0 = cx + 8.0 * math.cos(a), cy + 8.0 * math.sin(a)
                x1, y1 = cx + 12.0 * math.cos(a), cy + 12.0 * math.sin(a)
                c.line(x0, y0, x1, y1)
                c.restoreState()
                continue
            ln = 10.0 + 27.0 * v / vmax
            if k == RECUR:
                c.setLineWidth(2.0); rgb(GOLD, 0.95)
            elif i == DEVI:
                c.setLineWidth(1.9); rgb(ROSE, 0.92)
            elif done:
                c.setLineWidth(1.25); rgb(EMERALD, 0.88)
            else:
                c.setLineWidth(0.5); rgb(INK, 0.42)
            c.line(cx + 7.0 * math.cos(a), cy + 7.0 * math.sin(a),
                   cx + ln * math.cos(a), cy + ln * math.sin(a))
            c.restoreState()

        if k == RECUR:
            diamond(cx, cy, 3.0, True, GOLD, 0.95)
        elif k == DEVI % N:
            diamond(cx, cy, 2.8, False, ROSE, 0.9, lw=0.7)
        else:
            diamond(cx, cy, 2.2, True, INK, 0.55)

        col_lab = GOLD if k == RECUR else (ROSE if k == DEVI % N else INK)
        tracked(cx, cy - R - 17.0, f"{k + 1:02d}", "Mono", 6.4, 1.6, align="c",
                col=col_lab, alpha=0.85 if col_lab is not INK else 0.55)

    tracked(ML, FY1 + 22.0, "SATU SIMPUL, ENAM PUTARAN  ·  JARI-JARI = BEBAN",
            "Mono", 6.6, 2.6, alpha=0.55)
    tracked(W - MR, FY1 + 22.0, "PUTARAN I DI ATAS, SEARAH JARUM", "Mono", 6.6, 2.6,
            align="r", alpha=0.45)
    tracked(W - MR, FY1 - ROWS * CH - 26.0, "TIGA PETAK KOSONG — 72 PETAK, 69 SIMPUL",
            "Mono", 6.4, 2.4, align="r", alpha=0.42)

    legend("SETIAP NAMA, SATU WAJAH")
    signature("SIMPUL", 44.0, 15.0, "enam jari-jari, dan tak ada dua yang sama")


# ══ PLATE V — the colophon ═════════════════════════════════════════════════
def plate_v():
    ground(414_303)
    frame("PLAT VII", "KOLOFON  ·  TENUN SELESAI SEBAGIAN", "SKALA 1 : 1",
          "TENUN — 302 DARI 414", "PLAT VII DARI VII")

    BASE = 1372.0
    span = W - ML - MR
    tracked(ML, BASE + 56.0, "414 TANDA, DALAM SATU BARIS", "Mono", 6.6, 2.6, alpha=0.55)
    tracked(W - MR, BASE + 56.0, "302 TERTENUN  ·  112 MENUNGGU", "Mono", 6.6, 2.6,
            align="r", alpha=0.45)
    c.saveState()
    c.setLineWidth(0.35); rgb(INK, 0.30)
    c.line(ML, BASE, W - MR, BASE)
    c.restoreState()
    for i in range(SEG):
        x = ML + span * i / (SEG - 1)
        k = i % N
        c.saveState()
        if k == RECUR:
            c.setLineWidth(1.7); rgb(GOLD, 0.95); h = 34.0
        elif i == DEVI:
            c.setLineWidth(1.5); rgb(ROSE, 0.92); h = 27.0
        elif i < DONE:
            c.setLineWidth(0.6); rgb(EMERALD, 0.88); h = 18.0
        else:
            c.setLineWidth(0.45); rgb(INK, 0.40); h = 7.0
        c.line(x, BASE, x, BASE + h)
        c.restoreState()

    tracked(W / 2.0, 1136.0, "yang tak kasatmata pun bisa dihitung,",
            "SerifIt", 25.0, 0.6, align="c", alpha=0.72)
    tracked(W / 2.0, 1102.0, "asal ditunggui cukup lama",
            "SerifIt", 25.0, 0.6, align="c", alpha=0.72)

    # register of colour
    tracked(ML, 452.0, "REGISTER WARNA — 05", "Mono", 6.4, 2.4, alpha=0.45)
    for j, (col, lab) in enumerate(((PAPER, "KERTAS"), (INK, "TINTA"), (EMERALD, "ZAMRUD"),
                                    (GOLD, "EMAS"), (ROSE, "MERAH"))):
        x = ML + j * 96.0
        c.saveState()
        rgb(col, 1.0, fill=True); rgb(INK, 0.35); c.setLineWidth(0.4)
        c.rect(x, 410.0, 18.0, 18.0, stroke=1, fill=1)
        c.restoreState()
        tracked(x, 394.0, lab, "Mono", 6.0, 2.0, alpha=0.42)

    for j, line in enumerate(("HURUF — ITALIANA · GEIST MONO · INSTRUMENT SERIF",
                              "TANDA — 414 · SIMPUL 69 · PUTARAN 6",
                              "KERTAS — A2 · 420 × 594 MM · VEKTOR")):
        tracked(W - MR, 452.0 - j * 19.0, line, "Mono", 6.4, 2.4, align="r", alpha=0.45)

    c.saveState()
    c.setLineWidth(0.35); rgb(INK, 0.28)
    c.line(ML, 274.0, W - MR, 274.0)
    c.restoreState()

    signature("SELESAI SEBAGIAN", 42.0, 14.0, "putaran ketujuh belum dimulai")


# ══ PLATE V — the register of absences ═════════════════════════════════════
def plate_v_tenggang():
    BX0 = ML + 52.0
    BX1 = W - MR - 132.0
    CELLW = (BX1 - BX0) / WIND
    GAP = 9.0
    FY = 1444.0
    PITCH = 14.1

    ground(112_069)
    frame("PLAT V", "TENGGANG  ·  YANG TIDAK HADIR", "SKALA 1 : 1",
          "TENUN — LUBANG DALAM KAIN", "PLAT V DARI VII")

    ROM = ("I", "II", "III", "IV", "V", "VI")
    for b in range(WIND):
        x = BX0 + b * CELLW + (CELLW - GAP) / 2.0
        tracked(x, FY + 20.0, ROM[b], "Mono", 7.0, 2.0, align="c", alpha=0.60)
    tracked(ML, FY + 44.0, "SIMPUL 01—69  ×  PUTARAN I—VI", "Mono", 6.6, 2.6, alpha=0.55)
    tracked(W - MR, FY + 44.0, "PANJANG = TENGGANG TERCATAT", "Mono", 6.6, 2.6,
            align="r", alpha=0.45)

    miss = [0] * N
    for k in range(N):
        y = FY - k * PITCH
        for b in range(WIND):
            i = b * N + k
            x0 = BX0 + b * CELLW
            x1 = x0 + CELLW - GAP
            c.saveState()
            if i >= DONE:
                c.setLineWidth(0.4); rgb(INK, 0.20); c.setDash(1.6, 2.6)
                c.line(x0, y, x1, y)
            elif SERIES[b][k] == 0.0:
                miss[k] += 1
                c.setLineWidth(0.4); rgb(ROSE, 0.55)
                c.line(x0, y, x1, y)
                c.setLineWidth(1.0); rgb(ROSE, 0.92)
                xm = (x0 + x1) / 2.0
                c.line(xm - 5.0, y, xm + 5.0, y)
                c.restoreState()
                diamond(xm, y, 3.2, False, ROSE, 0.9, lw=0.7)
                continue
            elif k == RECUR:
                c.setLineWidth(2.6); rgb(GOLD, 0.92)
                c.line(x0, y, x1, y)
            else:
                c.setLineWidth(2.2); rgb(INK, 0.55)
                c.line(x0, y, x1, y)
            c.restoreState()

        if k % 5 == 0:
            tracked(ML + 30.0, y - 2.3, f"{k + 1:02d}", "Mono", 6.2, 1.4,
                    align="r", alpha=0.52)
        if miss[k]:
            c.saveState()
            c.setLineWidth(2.4); rgb(ROSE, 0.75)
            c.line(BX1 + 22.0, y, BX1 + 22.0 + 24.0 * miss[k], y)
            c.restoreState()

    total = sum(miss)
    yb = FY - (N - 1) * PITCH
    c.saveState()
    c.setLineWidth(0.35); rgb(INK, 0.28)
    c.line(ML, yb - 26.0, W - MR, yb - 26.0)
    c.restoreState()
    tracked(ML, yb - 46.0, f"TENGGANG TERCATAT — {total:02d} DARI 302 TANDA",
            "Mono", 6.6, 2.6, col=ROSE, alpha=0.80)
    tracked(W - MR, yb - 46.0, "PUTUS-PUTUS — BELUM DITENUN, BELUM DIHITUNG",
            "Mono", 6.4, 2.4, align="r", alpha=0.42)

    legend("LUBANG PUN DICATAT")
    signature("TENGGANG", 44.0, 15.0, "kain dikenali juga dari tempat benangnya tak sampai")


# ══ PLATE VI — the seventh rotation ════════════════════════════════════════
def plate_vi_ketujuh():
    CX, CY = W / 2.0, 1092.0
    R_ARC = 268.0
    R_HAIR = 300.0
    R_DIA = 330.0

    ground(7_069_00)
    frame("PLAT VI", "PUTARAN KETUJUH  ·  BELUM DITENUN", "SKALA 1 : 1",
          "TENUN — 69 TANDA MENANTI", "PLAT VI DARI VII")

    def ang(k):
        return math.pi / 2.0 - 2.0 * math.pi * k / N

    def pol(a, r):
        return CX + r * math.cos(a), CY + r * math.sin(a)

    c.saveState()
    c.setLineWidth(0.18)
    for k in range(N):
        a = ang(k); rgb(INK, 0.14)
        x0, y0 = pol(a, 96.0); x1, y1 = pol(a, R_HAIR - 6.0)
        c.line(x0, y0, x1, y1)
    c.restoreState()

    # where the weft would run, had it been laid
    c.saveState()
    c.setLineWidth(0.5); rgb(INK, 0.30); c.setDash(2.2, 4.2)
    c.circle(CX, CY, R_ARC, stroke=1, fill=0)
    c.setLineWidth(0.4); rgb(INK, 0.32); c.setDash()
    c.circle(CX, CY, R_HAIR, stroke=1, fill=0)
    c.restoreState()

    for k in range(N):
        a = ang(k)
        long_tick = (k % 5 == 0)
        c.saveState()
        c.setLineWidth(0.6 if long_tick else 0.35)
        rgb(INK, 0.55 if long_tick else 0.30)
        x0, y0 = pol(a, R_HAIR + 6.0 - (4.0 if long_tick else 0.0))
        x1, y1 = pol(a, R_HAIR + 18.0)
        c.line(x0, y0, x1, y1)
        c.restoreState()
        dx, dy = pol(a, R_DIA)
        if k == RECUR:
            diamond(dx, dy, 5.0, False, GOLD, 0.85, lw=1.0)
        else:
            diamond(dx, dy, 3.4, False, INK, 0.34, lw=0.5)

    for k, lab in ((0, "01"), (18, "18"), (35, "35"), (52, "52")):
        x, y = pol(ang(k), R_DIA + 21.0)
        tracked(x, y - 2.6, lab, "Mono", 7.0, 1.4, align="c", alpha=0.48)

    diamond(CX, CY, 5.0, False, INK, 0.35, lw=0.45)

    tracked(ML, CY + R_DIA + 56.0, "69 SIMPUL SIAP  ·  0 TANDA", "Mono", 6.6, 2.6, alpha=0.55)
    tracked(W - MR, CY + R_DIA + 56.0, "SEMUA BERLIAN MASIH KOSONG", "Mono", 6.6, 2.6,
            align="r", alpha=0.45)

    tracked(W / 2.0, 560.0, "alat tenunnya sudah dipasang;", "SerifIt", 24.0, 0.6,
            align="c", alpha=0.66)
    tracked(W / 2.0, 528.0, "tinggal menunggu orang datang", "SerifIt", 24.0, 0.6,
            align="c", alpha=0.66)

    legend("BELUM SATU PUN")
    signature("PUTARAN KETUJUH", 42.0, 14.0, "yang kosong pun sudah punya tempatnya")


# ── output ─────────────────────────────────────────────────────────────────
def render(path, pages):
    global c
    c = rl_canvas.Canvas(path, pagesize=A2)
    c.setTitle("Woven Arithmetic — Plates I–III")
    c.setAuthor("Woven Arithmetic")
    for fn in pages:
        fn()
        c.showPage()
    c.save()
    print("wrote", path)


render(f"{DIR}/woven-arithmetic-plates-i-vii.pdf", [plate_i, plate_ii, plate_iii, plate_iv, plate_v_tenggang, plate_vi_ketujuh, plate_v])
render(f"{DIR}/woven-arithmetic-plate-i.pdf", [plate_i])
