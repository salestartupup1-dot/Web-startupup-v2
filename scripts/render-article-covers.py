"""Rasterize our original SVG illustrations for social previews that require PNG."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]/'public'/'articles'
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge')
    page=browser.new_page(viewport={'width':960,'height':640},device_scale_factor=1)
    for source in sorted(root.glob('*.svg')):
        page.goto(source.as_uri(),wait_until='load')
        page.locator('svg').screenshot(path=str(source.with_suffix('.png')))
    browser.close()
print('Rendered original covers to PNG for sharing metadata')
