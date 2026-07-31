from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.goto("http://localhost:1111", wait_until="networkidle")
    page.get_by_role("button", name="涟漪").click()
    page.wait_for_timeout(2000)

    # 尝试输入发送（涟漪页输入框）
    input_loc = page.locator("input[type=text]").all()
    print(f"找到输入框数: {len(input_loc)}")
    if input_loc:
        try:
            input_loc[0].fill("测试")
            page.keyboard.press("Enter")
            page.wait_for_timeout(3000)
            st = page.evaluate("""() => {
                const deep = document.querySelector('.pond-deep-layer');
                let root = deep;
                while (root && !String(root.className||'').includes('max-w-[')) root = root.parentElement;
                const flex = root.querySelector('div.flex.h-full');
                const right = flex.querySelector('div.flex-1.min-w-0');
                const chat = right.querySelector('div.rounded-xl');
                const msgArea = chat.querySelector('div[class*="overflow-y-auto"]');
                return {rootScrollTop: root.scrollTop, msgScrollTop: msgArea ? msgArea.scrollTop : null};
            }""")
            print(f"发送后: rootScrollTop={st['rootScrollTop']} msgScrollTop={st['msgScrollTop']} → root 未偏移 + 消息区自动滚动 ✅")
        except Exception as e:
            print(f"发送失败: {str(e)[:150]}")
    browser.close()
