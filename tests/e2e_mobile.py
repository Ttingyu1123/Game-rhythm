import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:5192")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    page = context.new_page()
    console_errors: list[str] = []
    page_errors: list[str] = []
    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(BASE_URL, wait_until="networkidle")
    song_buttons = page.locator("[data-song-id]")
    assert song_buttons.count() == 4
    assert page.locator("#song-count").inner_text() == "4 首可遊玩"
    assert page.locator("#new-song-slot").count() == 0
    song_detail_font_size = page.locator(".song-option__details").first.evaluate(
        "element => parseFloat(getComputedStyle(element).fontSize)"
    )
    assert song_detail_font_size >= 10.4
    for index in range(song_buttons.count()):
        assert song_buttons.nth(index).bounding_box()["height"] >= 44
    assert (
        page.locator("#song-library").bounding_box()["y"]
        < page.locator(".song-card").bounding_box()["y"]
    )
    assert page.locator("#song-library").bounding_box()["height"] < 430
    song_buttons.nth(3).click()
    assert page.locator("#song-card-title").inner_text() == "爪爪大遊行"
    song_buttons.first.click()
    assert "入門 Lv.1" in page.locator(".song-meta").inner_text()
    assert page.locator("[data-difficulty-level]").count() == 4
    page.locator('[data-difficulty-level="3"]').click()
    assert "202 顆" in page.locator("#difficulty-description").inner_text()
    page.locator('[data-difficulty-level="1"]').click()
    assert page.evaluate(
        "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
    )
    assert page.locator("#song-options").evaluate(
        "element => getComputedStyle(element).gridTemplateColumns.split(' ').length"
    ) == 1
    page.set_viewport_size({"width": 800, "height": 844})
    assert page.locator("#song-options").evaluate(
        "element => getComputedStyle(element).gridTemplateColumns.split(' ').length"
    ) == 2
    page.set_viewport_size({"width": 390, "height": 844})
    menu_artifact = Path(__file__).resolve().parents[1] / "artifacts" / "06-mobile-menu.png"
    page.screenshot(path=str(menu_artifact), full_page=True)
    page.set_viewport_size({"width": 844, "height": 390})
    page.locator("#start-button").click()
    page.wait_for_function(
        "document.querySelector('#countdown-overlay').hidden === false",
        timeout=15_000,
    )
    page.locator("#game-song-title").evaluate(
        "element => { element.textContent = 'A'.repeat(120); }"
    )
    assert page.locator(".game-header").evaluate(
        "element => element.scrollWidth <= element.clientWidth"
    )
    assert page.locator("#game-song-title").evaluate(
        "element => getComputedStyle(element).textOverflow === 'ellipsis'"
    )

    pressed = page.evaluate(
        """
        () => {
          const left = document.querySelector('[data-lane="left"]');
          const right = document.querySelector('[data-lane="right"]');
          left.setPointerCapture = () => {};
          right.setPointerCapture = () => {};
          left.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, cancelable: true, pointerId: 11, pointerType: 'touch', buttons: 1
          }));
          right.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, cancelable: true, pointerId: 12, pointerType: 'touch', buttons: 1
          }));
          const state = [left.classList.contains('is-pressed'), right.classList.contains('is-pressed')];
          left.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, cancelable: true, pointerId: 11, pointerType: 'touch'
          }));
          right.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, cancelable: true, pointerId: 12, pointerType: 'touch'
          }));
          return state;
        }
        """
    )
    assert pressed == [True, True]
    assert page.locator("#touch-controls").is_visible()
    assert page.locator("[data-lane]").count() == 4
    artifact = Path(__file__).resolve().parents[1] / "artifacts" / "07-mobile-landscape.png"
    page.screenshot(path=str(artifact), full_page=True)
    browser.close()

assert not page_errors, f"Page errors: {page_errors}"
assert not console_errors, f"Console errors: {console_errors}"
print("MOBILE_E2E_OK four controls simultaneous pointers")
