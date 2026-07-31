from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    # 三种视口：futao 截图尺寸 + 标准 + 小窗
    for w, h, label in [(2549, 1209, "2549x1209-futao"), (1440, 900, "1440x900"), (1280, 720, "1280x720")]:
        page = browser.new_page(viewport={"width": w, "height": h})
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto("http://localhost:1111", wait_until="networkidle")
        page.get_by_role("button", name="涟漪").click()
        page.wait_for_timeout(2500)
        info = page.evaluate("""() => {
            const deep = document.querySelector('.pond-deep-layer');
            let root = deep;
            while (root && !String(root.className||'').includes('max-w-[')) root = root.parentElement;
            const chatWrap = root.querySelector('div.flex.h-full > div.flex-1.min-w-0');
            const chat = chatWrap && chatWrap.querySelector('div.rounded-xl');
            const r = (el) => { if(!el) return null; const b=el.getBoundingClientRect(); return {top:Math.round(b.top), bottom:Math.round(b.bottom), h:Math.round(b.height)}; };
            return {rootScrollTop: root.scrollTop, rootTop: Math.round(root.getBoundingClientRect().top), chatWrap: r(chatWrap), chat: r(chat), vh: window.innerHeight};
        }""")
        real = [e for e in errs if 'favicon' not in e.lower()]
        ok = info['chat'] and info['chat']['top'] >= 56 and info['chat']['top'] < 100
        print(f"[{label}] rootScrollTop={info['rootScrollTop']} rootTop={info['rootTop']} chatWrap={info['chatWrap']} chat={info['chat']} {'✅ 聊天窗在视口内' if ok else '❌ 仍偏移'}")
        if real: print(f"   console错误: {real[:3]}")
        page.screenshot(path=f"scroll_fix_{w}.png")
        page.close()
    browser.close()
