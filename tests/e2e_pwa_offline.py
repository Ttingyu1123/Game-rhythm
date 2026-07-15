"""PWA offline: after one online visit, the shell loads with the server GONE, and any
song played once starts offline from the service-worker cache. A song never played
must fail with the error toast instead of hanging.

Self-contained: builds nothing, but starts its own `vite preview` on a dedicated port
and KILLS the server for the offline phase. Playwright's context.set_offline() is not
used because it does not apply to service-worker-initiated fetches — with the server
still running, the SW happily fetches "offline" and the test proves nothing. A dead
server is offline for every request path.

Requires a prior `npm run build` (the service worker only exists in the build).
"""

import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = 7424
BASE_URL = f"http://localhost:{PORT}"


def wait_for(predicate, timeout_s: float, what: str) -> None:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.3)
    raise TimeoutError(what)


def server_alive() -> bool:
    try:
        with urllib.request.urlopen(f"{BASE_URL}/", timeout=2) as response:
            return response.status == 200
    except (urllib.error.URLError, OSError):
        return False


def start_song(page, song_id: str, timeout: int = 25_000) -> None:
    page.locator(f'[data-song-id="{song_id}"]').click()
    page.locator("#start-button").click()
    page.wait_for_function(
        "document.querySelector('#countdown-overlay').hidden === false", timeout=timeout
    )


def quit_to_menu(page) -> None:
    page.wait_for_function(
        "document.querySelector('#countdown-overlay').hidden === true", timeout=10_000
    )
    page.keyboard.press("KeyP")
    page.locator("#quit-button").click()
    page.wait_for_function(
        "document.querySelector('#menu-screen').hidden === false", timeout=5_000
    )


def main() -> None:
    assert (ROOT / "dist" / "sw.js").exists(), "run `npm run build` first — no service worker in dist/"

    # Real node entry point, not the npx .cmd shim: terminates cleanly on every OS.
    server = subprocess.Popen(
        ["node", str(ROOT / "node_modules" / "vite" / "bin" / "vite.js"),
         "preview", "--port", str(PORT), "--strictPort"],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        wait_for(server_alive, 30, "vite preview did not come up")

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            page.goto(BASE_URL, wait_until="networkidle")

            # The page must be CONTROLLED by the service worker before playing,
            # otherwise the mp3 fetch bypasses the worker and never gets cached.
            page.wait_for_function("navigator.serviceWorker.ready.then(() => true)", timeout=15_000)
            if page.evaluate("navigator.serviceWorker.controller === null"):
                page.reload(wait_until="networkidle")
            assert page.evaluate("navigator.serviceWorker.controller !== null"), (
                "service worker never took control of the page"
            )

            # Online: play one song so its MP3 enters the runtime cache.
            start_song(page, "moonlit-gear-parade")
            quit_to_menu(page)
            cached = page.evaluate(
                """async () => {
                    const cache = await caches.open('moonlit-music');
                    return (await cache.keys()).map((request) => request.url);
                }"""
            )
            assert any("main-theme" in url for url in cached), (
                f"played song's MP3 missing from the runtime cache: {cached}"
            )

            # Kill the server: true offline for the page AND the service worker.
            server.terminate()
            server.wait(timeout=15)
            wait_for(lambda: not server_alive(), 15, "preview port still answering")

            page.reload(wait_until="load")
            assert "月影祕律" in page.title()
            assert not page.locator("#menu-screen").is_hidden()
            assert page.locator("[data-song-id]").count() == 7

            # The played song starts from cache with no server at all.
            start_song(page, "moonlit-gear-parade")
            quit_to_menu(page)

            # A song never played has no cached audio: it must surface the error
            # toast and return to the menu instead of hanging in loading.
            page.locator('[data-song-id="swing-carnival"]').click()
            page.locator("#start-button").click()
            page.wait_for_function(
                "!document.querySelector('#error-toast').hidden", timeout=15_000
            )
            assert page.locator("#error-toast").inner_text(), "expected an error message"
            assert not page.locator("#menu-screen").is_hidden()

            browser.close()
    finally:
        if server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()

    print("PWA_OFFLINE_E2E_OK shell and played songs survive a dead server, uncached song fails cleanly")


if __name__ == "__main__":
    main()
