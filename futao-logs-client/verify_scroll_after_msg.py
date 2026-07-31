from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.goto("http://localhost:1111", wait_until="networkidle")
    page.get_by_role("button", name="涟漪").click()
    page.wait_for_timeout(2000)

    # 初始状态
    init = page.evaluate("""() => {
        const deep = document.querySelector('.pond-deep-layer');
        let root = deep;
        while (root && !String(root.className||'').includes('max-w-[')) root = root.parentElement;
        // 聊天窗消息区（overflow-y-auto）
        const msgArea = root.querySelector('div[class*="overflow-y-auto"]');
        return {rootScrollTop: root.scrollTop, msgScrollTop: msgArea ? msgArea.scrollTop : null, msgScrollH: msgArea ? msgArea.scrollHeight : null, msgClientH: msgArea ? msgArea.clientHeight : null};
    }""")
    print(f"初始: rootScrollTop={init['rootScrollTop']} msgScrollTop={init['msgScrollTop']} scrollH={init['msgScrollH']} clientH={init['msgClientH']}")

    # 输入并发送一条消息，触发 messages 变化 → bottomRef scrollIntoView
    try:
        page.locator("input[type=text]").first.fill("你好，测试滚动")
        page.keyboard.press("Enter")
        page.wait_for_timeout(2500)
        after = page.evaluate("""() => {
            const deep = document.querySelector('.pond-deep-layer');
            let root = deep;
            while (root && !String(root.className||'').includes('max-w-[')) root = root.parentElement;
            const msgArea = root.querySelector('div[class*="overflow-y-auto"]');
            return {rootScrollTop: root.scrollTop, msgScrollTop: msgArea ? msgArea.scrollTop : null, msgScrollH: msgArea ? msgArea.scrollHeight : null, msgClientH: msgArea ? msgArea.clientHeight : null};
        }""")
        print(f"发送后: rootScrollTop={after['rootScrollTop']} msgScrollTop={after['msgScrollTop']} scrollH={after['msgScrollH']} clientH={after['msgClientH']}")
        # 消息区应滚动到底：scrollTop + clientH ≈ scrollH
        near_bottom = after['msgScrollH'] and after['msgScrollTop'] + after['msgClientH'] >= after['msgScrollH'] - 5
        root_ok = after['rootScrollTop'] == 0
        print(f"✅ 消息区滚到底 + root 未被顶出" if near_bottom and root_ok else "❌ 滚动行为异常")
    except Exception as e:
        print(f"发送消息失败（可能无会话）: {str(e)[:120]}")
    browser.close()
