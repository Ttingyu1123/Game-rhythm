import os
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:5192")
SONGS = [
    ("swing-carnival", "搖擺嘉年華", "Swing_Carnival.mp3"),
    ("dancing-on-a-cloud", "雲端漫舞", "Dancing_on_a_Cloud.mp3"),
    ("parade-of-paws", "爪爪大遊行", "Parade_of_Paws.mp3"),
]


def source_filename_for(request_filename: str) -> str | None:
    for _, _, source_filename in SONGS:
        stem = source_filename.removesuffix(".mp3")
        if request_filename == source_filename:
            return source_filename
        if request_filename.startswith(f"{stem}-") and request_filename.endswith(".mp3"):
            return source_filename
    return None


def main() -> None:
    console_errors: list[str] = []
    page_errors: list[str] = []
    audio_responses: dict[str, int] = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        def record_audio_response(response) -> None:
            filename = unquote(urlparse(response.url).path).rsplit("/", 1)[-1]
            source_filename = source_filename_for(filename)
            if source_filename:
                audio_responses[source_filename] = response.status

        page.on("response", record_audio_response)
        response = page.goto(BASE_URL, wait_until="networkidle")
        assert response and response.ok, "The rhythm game did not load."

        for song_id, title, filename in SONGS:
            page.locator(f'[data-song-id="{song_id}"]').click()
            assert page.locator("#song-card-title").inner_text() == title
            assert page.locator('[data-difficulty-level="1"]').get_attribute("aria-pressed") == "true"

            page.locator("#start-button").click()
            page.wait_for_function(
                "document.querySelector('#countdown-overlay').hidden === false",
                timeout=20_000,
            )
            assert page.locator("#game-song-title").inner_text() == title
            assert "入門 Lv.1" in page.locator("#game-difficulty").inner_text()
            assert audio_responses.get(filename) == 200, (
                f"Expected a successful response for {filename}; got {audio_responses}."
            )

            page.wait_for_function(
                "document.querySelector('#countdown-overlay').hidden === true",
                timeout=8_000,
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

        browser.close()

    assert not page_errors, f"Page errors: {page_errors}"
    assert not console_errors, f"Console errors: {console_errors}"
    assert set(audio_responses) >= {filename for _, _, filename in SONGS}
    print("SONG_LOADING_E2E_OK three MP3 files decoded and started")
    print("AUDIO_RESPONSES", audio_responses)
    print("CONSOLE_ERRORS 0")
    print("PAGE_ERRORS 0")


if __name__ == "__main__":
    main()
