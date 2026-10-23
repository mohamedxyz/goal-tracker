# Renders GoalTerra launcher icons, adaptive-icon foregrounds and splash screens from the Orbit logo.
# Dev tool: python3 scripts/make-icons.py (needs Playwright + Pillow). Output goes into android/app/src/main/res.
import asyncio, os
from playwright.async_api import async_playwright
from PIL import Image
RES = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
BG = '#F3F7F6'
LOGO = '''<g transform="rotate(-22 50 50)"><ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="#2E9E6B" stroke-width="4"/></g><circle cx="50" cy="50" r="27" fill="#0E4F5C"/><g clip-path="url(#c)"><ellipse cx="50" cy="50" rx="27" ry="9" fill="none" stroke="#2F8C8A" stroke-width="1.5"/><path d="M20 54 C28 43 39 45 46 51 C52 57 60 50 68 54 C73 57 77 61 80 68 L80 82 L20 82 Z" fill="#2E9E6B"/></g><g transform="rotate(-22 50 50)"><path d="M5 50 A45 15 0 0 0 95 50" fill="none" stroke="#2E9E6B" stroke-width="4" stroke-linecap="round"/><circle cx="78.9" cy="61.5" r="7.5" fill="#E8803A" stroke="BGC" stroke-width="2.8"/></g>'''
def svg(size, scale, bg, shape='none', text=False):
    inner = LOGO.replace('BGC', bg or BG)
    s = scale * size / 100
    off = (size - 100 * s) / 2
    back = ''
    if bg and shape == 'square': back = f'<rect width="{size}" height="{size}" rx="{size*0.22}" fill="{bg}"/>'
    if bg and shape == 'circle': back = f'<circle cx="{size/2}" cy="{size/2}" r="{size/2}" fill="{bg}"/>'
    if bg and shape == 'full': back = f'<rect width="{size}" height="{size}" fill="{bg}"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}"><defs><clipPath id="c"><circle cx="50" cy="50" r="27"/></clipPath></defs>{back}<g transform="translate({off} {off}) scale({s})">{inner}</g></svg>'
async def render(pg, markup, w, h, path):
    await pg.set_viewport_size({'width': w, 'height': h})
    await pg.set_content(f'<html><body style="margin:0;background:transparent">{markup}</body></html>')
    await pg.screenshot(path=path, omit_background=True, clip={'x': 0, 'y': 0, 'width': w, 'height': h})
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        for d, n in {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}.items():
            L, F = int(48 * n), int(108 * n)
            await render(pg, svg(L, .86, BG, 'square'), L, L, f'{RES}/mipmap-{d}/ic_launcher.png')
            await render(pg, svg(L, .86, BG, 'circle'), L, L, f'{RES}/mipmap-{d}/ic_launcher_round.png')
            await render(pg, svg(F, .56, None), F, F, f'{RES}/mipmap-{d}/ic_launcher_foreground.png')
        for root, _, files in os.walk(RES):
            for f in files:
                if f == 'splash.png':
                    path = os.path.join(root, f); w, h = Image.open(path).size; m = min(w, h)
                    logo = svg(int(m * .42), .9, None)
                    await render(pg, f'<div style="width:{w}px;height:{h}px;background:{BG};display:grid;place-items:center">{logo}</div>', w, h, path)
        await b.close()
    print('icons and splash screens written')
asyncio.run(main())
