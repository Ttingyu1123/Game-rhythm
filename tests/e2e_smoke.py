import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:5192")
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"


def main() -> None:
    console_errors: list[str] = []
    page_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        response = page.goto(BASE_URL, wait_until="networkidle")
        assert response and response.ok, "The Vite page did not load successfully."
        assert page.locator("#menu-screen").is_visible()
        assert page.locator("#game-title").is_visible()
        song_buttons = page.locator("[data-song-id]")
        expected_song_ids = [
            "moonlit-gear-parade",
            "swing-carnival",
            "dancing-on-a-cloud",
            "parade-of-paws",
            "whimsical-cute",
            "miniature-world",
            "neon-mirage",
        ]
        assert song_buttons.count() == len(expected_song_ids), (
            f"Expected {len(expected_song_ids)} song buttons; page errors: {page_errors}; "
            f"console errors: {console_errors}"
        )
        assert [
            song_buttons.nth(index).get_attribute("data-song-id")
            for index in range(song_buttons.count())
        ] == expected_song_ids
        assert song_buttons.first.get_attribute("aria-pressed") == "true"
        assert page.locator('[data-song-id][aria-pressed="true"]').count() == 1
        assert page.locator("#song-count").inner_text() == "7 首可遊玩"
        assert page.locator("#new-song-slot").count() == 0

        song_buttons.nth(1).focus()
        page.keyboard.press("Enter")
        assert song_buttons.nth(1).get_attribute("aria-pressed") == "true"
        assert page.locator("#song-card-title").inner_text() == "搖擺嘉年華"
        assert page.locator("#song-bpm").inner_text() == "111"
        assert page.locator("#song-duration").inner_text() == "1:10"
        assert page.locator("#menu-screen").is_visible()

        song_buttons.nth(2).focus()
        page.keyboard.press("Space")
        assert song_buttons.nth(2).get_attribute("aria-pressed") == "true"
        assert page.locator("#song-card-title").inner_text() == "雲端漫舞"
        assert page.locator("#song-bpm").inner_text() == "127"
        assert page.locator("#song-duration").inner_text() == "2:34"
        assert page.locator("#song-selection-status").inner_text() == "已選擇雲端漫舞"
        assert page.locator("#menu-screen").is_visible()

        song_buttons.nth(3).click()
        assert page.locator("#song-card-title").inner_text() == "奇想貓帽遊行"
        assert page.locator("#song-key").inner_text() == "C major"
        song_buttons.first.click()
        assert "入門 Lv.1" in page.locator(".song-meta").inner_text()
        difficulty_buttons = page.locator("[data-difficulty-level]")
        assert difficulty_buttons.count() == 4
        assert page.locator('[data-difficulty-level="1"]').get_attribute("aria-pressed") == "true"
        page.locator('[data-difficulty-level="4"]').click()
        assert "專家 Lv.4" in page.locator("#song-difficulty").inner_text()
        page.locator('[data-difficulty-level="2"]').click()
        assert "146 顆" in page.locator("#difficulty-description").inner_text()
        assert "學徒 Lv.2" in page.locator("#record-difficulty").inner_text()
        page.screenshot(path=str(ARTIFACTS / "01-menu.png"), full_page=True)

        page.locator("#volume-slider").fill("0.55")
        page.locator("#speed-select").select_option("1.25")
        page.reload(wait_until="networkidle")
        assert page.locator("#volume-slider").input_value() == "0.55"
        assert page.locator("#speed-select").input_value() == "1.25"
        page.locator('[data-difficulty-level="2"]').click()

        page.locator("#start-button").click()
        page.wait_for_function(
            "document.querySelector('#game-screen').hidden === false",
            timeout=15_000,
        )
        page.wait_for_function(
            "document.querySelector('#countdown-overlay').hidden === false",
            timeout=15_000,
        )
        page.screenshot(path=str(ARTIFACTS / "02-countdown.png"), full_page=True)
        page.wait_for_function(
            "document.querySelector('#countdown-overlay').hidden === true",
            timeout=8_000,
        )
        assert "學徒 Lv.2" in page.locator("#game-difficulty").inner_text()
        assert page.locator("#game-song-title").inner_text() == "月光齒輪巡遊"

        page.wait_for_timeout(5_500)
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(180)
        judgment = page.locator("#hud-judgment").inner_text()
        assert judgment in {"MARVELOUS", "PERFECT", "GREAT", "GOOD"}, judgment
        assert page.locator("#hud-combo").inner_text() == "1"
        page.screenshot(path=str(ARTIFACTS / "03-gameplay.png"), full_page=True)

        page.keyboard.press("KeyP")
        page.wait_for_function(
            "document.querySelector('#pause-overlay').hidden === false",
            timeout=3_000,
        )
        paused_time = page.locator("#hud-time").inner_text()
        page.wait_for_timeout(1_100)
        assert page.locator("#hud-time").inner_text() == paused_time
        page.screenshot(path=str(ARTIFACTS / "04-pause.png"), full_page=True)

        page.locator("#resume-button").click()
        page.wait_for_function(
            "document.querySelector('#pause-overlay').hidden === true",
            timeout=3_000,
        )
        page.wait_for_function(
            "document.querySelector('#countdown-overlay').hidden === false",
            timeout=3_000,
        )
        page.wait_for_function(
            "document.querySelector('#countdown-overlay').hidden === true",
            timeout=6_000,
        )

        page.keyboard.press("KeyP")
        page.wait_for_function(
            "document.querySelector('#pause-overlay').hidden === false",
            timeout=3_000,
        )
        page.locator("#quit-button").click()
        page.wait_for_function(
            "document.querySelector('#menu-screen').hidden === false",
            timeout=3_000,
        )

        page.locator("#start-button").click()
        page.wait_for_function(
            "document.querySelector('#countdown-overlay').hidden === true",
            timeout=15_000,
        )
        page.wait_for_function(
            "document.querySelector('#result-screen').hidden === false",
            timeout=90_000,
        )
        assert page.locator("#result-grade").inner_text() == "D"
        assert page.locator("#result-title").inner_text() == "月光齒輪巡遊"
        assert page.locator("#result-song-en").inner_text() == "Moonlit Gear Parade"
        assert int(page.locator("#result-miss").inner_text()) > 0
        assert page.locator("#result-score").inner_text() == "0"
        save_value = page.evaluate("localStorage.getItem('moonlit-arcana-save')")
        assert save_value and 'moonlit-gear-parade' in save_value
        assert 'journeyman' in save_value
        page.screenshot(path=str(ARTIFACTS / "05-result.png"), full_page=True)

        browser.close()

    assert not page_errors, f"Page errors: {page_errors}"
    assert not console_errors, f"Console errors: {console_errors}"
    print("E2E_OK menu settings countdown hit pause resume quit result storage")
    print("CONSOLE_ERRORS 0")
    print("PAGE_ERRORS 0")


if __name__ == "__main__":
    main()
