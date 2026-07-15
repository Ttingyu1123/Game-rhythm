"""iOS Safari Web Audio unlock guard.

Safari only unlocks an AudioContext that is created and resumed inside the SAME TASK as
the user gesture. A context born after an await or requestAnimationFrame stays suspended
forever: currentTime never advances, so the countdown freezes at 3 and nothing plays.

Chromium is lenient here (its user activation survives across tasks), which is exactly
why the desktop and mobile suites cannot catch this. So we emulate Safari's rule: any
context born outside the gesture task is forced to stay suspended.

Gesture-task detection is exact: a capture listener on document runs first and a bubble
listener on window runs last, both inside the same event dispatch, so anything scheduled
after an await or rAF observes __gesture === false.

Run against a dev server:  BASE_URL=http://localhost:7421 python tests/e2e_ios_audio_unlock.py
"""

import os

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:5192")

STRICT_SAFARI = """
window.__gesture = false;
window.__bornInGesture = null;
for (const type of ['click', 'keydown', 'pointerdown', 'touchstart']) {
  document.addEventListener(type, () => { window.__gesture = true; }, true);
  window.addEventListener(type, () => { window.__gesture = false; }, false);
}

const Native = window.AudioContext || window.webkitAudioContext;
const Wrapped = function (...args) {
  const context = new Native(...args);
  const bornInGesture = window.__gesture === true;
  window.__bornInGesture = bornInGesture;
  window.__ctx = context;

  const nativeResume = context.resume.bind(context);
  const nativeSuspend = context.suspend.bind(context);
  if (!bornInGesture) nativeSuspend();
  context.resume = function () {
    if (window.__gesture === true) return nativeResume();
    return Promise.resolve();
  };
  return context;
};
Wrapped.prototype = Native.prototype;
window.AudioContext = Wrapped;
window.webkitAudioContext = Wrapped;
"""

SONGS = ["moonlit-gear-parade", "whimsical-cute", "neon-mirage"]


def main() -> None:
    page_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(**playwright.devices["iPhone 13"])
        page = context.new_page()
        page.add_init_script(STRICT_SAFARI)
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        for song_id in SONGS:
            page.goto(BASE_URL, wait_until="networkidle")
            page.locator(f'[data-song-id="{song_id}"]').scroll_into_view_if_needed()
            page.locator(f'[data-song-id="{song_id}"]').tap()
            page.locator("#start-button").tap()

            page.wait_for_function(
                "document.querySelector('#countdown-overlay').hidden === false",
                timeout=20_000,
            )
            assert page.evaluate("() => window.__bornInGesture") is True, (
                f"{song_id}: AudioContext was created outside the gesture task; "
                "iOS Safari would leave it suspended forever."
            )

            # The audio clock must actually advance, otherwise the countdown sticks at 3.
            page.wait_for_function(
                "() => window.__ctx && window.__ctx.state === 'running'", timeout=5_000
            )
            before = page.evaluate("() => window.__ctx.currentTime")
            page.wait_for_timeout(700)
            after = page.evaluate("() => window.__ctx.currentTime")
            assert after > before, (
                f"{song_id}: audio clock frozen at {before}; countdown would stick at 3."
            )

            # And the countdown must run down and hand over to gameplay.
            page.wait_for_function(
                "document.querySelector('#countdown-overlay').hidden === true",
                timeout=12_000,
            )

        assert not page_errors, f"Page errors: {page_errors}"
        browser.close()

    print(f"IOS_AUDIO_UNLOCK_OK {len(SONGS)} songs unlock audio inside the gesture task")


if __name__ == "__main__":
    main()
