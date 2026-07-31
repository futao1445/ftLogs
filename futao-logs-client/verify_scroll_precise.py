from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.goto("http://localhost:1111", wait_until="networkidle")
    page.get_by_role("button", name="涟漪").click()
    page.wait_for_timeout(2000)

    # 精确找聊天窗消息区：在 rounded-xl 聊天窗内、overflow-y-auto 的元素
    info = page.evaluate("""() => {
        const deep = document.querySelector('.pond-deep-layer');
        let root = deep;
        while (root && !String(root.className||'').includes('max-w-[')) root = root.parentElement;
        const flex = root.querySelector('div.flex.h-full');
        const right = flex.querySelector('div.flex-1.min-w-0');
        const chat = right.querySelector('div.rounded-xl');
        const msgArea = chat.querySelector('div[class*="overflow-y-auto"]');
        const r = (el) => { if(!el) return null; const b=el.getBoundingClientRect(); return {top:Math.round(b.top), h:Math.round(b.height)}; };
        return {
            chat: r(chat),
            msgArea: r(msgArea),
            msgScrollTop: msgArea.scrollTop,
            msgScrollH: msgArea.scrollHeight,
            msgClientH: msgArea.clientHeight,
            rootScrollTop: root.scrollTop,
            bottomRefVisible: !!chat.querySelector('div[style*="height"]')
        };
    }""")
    print("聊天窗:", info['chat'])
    print(f"消息区: {info['msgArea']} scrollTop={info['msgScrollTop']} scrollH={info['msgScrollH']} clientH={info['msgClientH']}")
    print(f"rootScrollTop={info['rootScrollTop']}")

    # 向消息区注入大量内容，模拟消息溢出一屏，然后看 bottomRef 是否滚动到消息区底部
    overflow = page.evaluate("""() => {
        const deep = document.querySelector('.pond-deep-layer');
        let root = deep;
        while (root && !String(root.className||'').includes('max-w-[')) root = root.parentElement;
        const flex = root.querySelector('div.flex.h-full');
        const right = flex.querySelector('div.flex-1.min-w-0');
        const chat = right.querySelector('div.rounded-xl');
        const msgArea = chat.querySelector('div[class*="overflow-y-auto"]');
        for (let i = 0; i < 20; i++) {
            const div = document.createElement('div');
            div.className = 'p-3 my-2 rounded-xl bg-gray-500/20';
            div.style.height = '80px';
            div.textContent = '消息 ' + i;
            msgArea.appendChild(div);
        }
        return {scrollH: msgArea.scrollHeight, clientH: msgArea.clientHeight};
    }""")
    print(f"\n注入 20 条消息后: scrollH={overflow['scrollH']} clientH={overflow['clientH']}")
    page.wait_for_timeout(1500)
    final = page.evaluate("""() => {
        const deep = document.querySelector('.pond-deep-layer');
        let root = deep;
        while (root && !String(root.className||'').includes('max-w-[')) root = root.parentElement;
        const flex = root.querySelector('div.flex.h-full');
        const right = flex.querySelector('div.flex-1.min-w-0');
        const chat = right.querySelector('div.rounded-xl');
        const msgArea = chat.querySelector('div[class*="overflow-y-auto"]');
        return {msgScrollTop: msgArea.scrollTop, msgScrollH: msgArea.scrollHeight, msgClientH: msgArea.clientHeight, rootScrollTop: root.scrollTop};
    }""")
    near_bottom = final['msgScrollTop'] + final['msgClientH'] >= final['msgScrollH'] - 5
    root_ok = final['rootScrollTop'] == 0
    print(f"最终: msgScrollTop={final['msgScrollTop']} scrollH={final['msgScrollH']} clientH={final['msgClientH']} rootScrollTop={final['rootScrollTop']}")
    print("✅ 消息区滚到底部，外层容器未被顶出" if near_bottom and root_ok else "❌ 滚动行为异常")
    browser.close()
