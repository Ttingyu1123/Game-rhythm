"""Latency wizard end-to-end: tap in rhythm with a known +50ms lag and check that the
wizard suggests approximately +50ms, applies it to the setting, and persists it.

The metronome tick times are captured by wrapping createOscillator on the page's own
AudioContext, and synthetic keydowns are dispatched against the SAME audio clock, so
the injected 50ms is exactly what the wizard should measure (modulo timer jitter).

Run against a dev/preview server:
  BASE_URL=http://localhost:7421 python tests/e2e_latency_wizard.py
"""

import os

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:5192")

CAPTURE_TICKS = """
window.__tickTimes = [];
const Native = window.AudioContext || window.webkitAudioContext;
const Wrapped = function (...args) {
  const context = new Native(...args);
  window.__ctx = context;
  const nativeCreateOscillator = context.createOscillator.bind(context);
  context.createOscillator = function () {
    const oscillator = nativeCreateOscillator();
    const nativeStart = oscillator.start.bind(oscillator);
    oscillator.start = function (when) {
      window.__tickTimes.push(when);
      return nativeStart(when);
    };
    return oscillator;
  };
  return context;
};
Wrapped.prototype = Native.prototype;
window.AudioContext = Wrapped;
window.webkitAudioContext = Wrapped;
"""

TAP_ALONG = """
() => new Promise((resolve) => {
  const LAG = 0.05;
  const codes = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
  const ticks = [...window.__tickTimes].sort((a, b) => a - b);
  let next = 0;
  const timer = setInterval(() => {
    const now = window.__ctx.currentTime;
    while (next < ticks.length && now >= ticks[next] + LAG) {
      const code = codes[next % codes.length];
      document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      next += 1;
    }
    if (next >= ticks.length) {
      clearInterval(timer);
      resolve(next);
    }
  }, 4);
})
"""


def main() -> None:
    page_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.add_init_script(CAPTURE_TICKS)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(BASE_URL, wait_until="networkidle")

        # --- Cancel path: Escape closes the wizard without touching the setting.
        page.locator("#calibration-button").click()
        assert not page.locator("#calibration-overlay").is_hidden()
        page.keyboard.press("Escape")
        assert page.locator("#calibration-overlay").is_hidden()
        assert page.locator("#menu-screen").is_visible(), "Escape must not leave the menu"

        # --- Not-enough-taps path: let the ticks run out untouched.
        page.locator("#calibration-button").click()
        page.wait_for_function(
            "!document.querySelector('#calibration-result').hidden", timeout=20_000
        )
        assert page.locator("#calibration-apply").is_disabled()
        assert "不足以判讀" in page.locator("#calibration-result").inner_text()

        # --- Happy path: retry, tap along with a known +50ms lag.
        page.locator("#calibration-retry").click()
        page.wait_for_function("window.__tickTimes.length >= 16", timeout=5_000)
        tapped = page.evaluate(TAP_ALONG)
        assert tapped >= 16, f"expected 16 synthetic taps, got {tapped}"
        page.wait_for_function(
            "!document.querySelector('#calibration-result').hidden", timeout=10_000
        )
        result_text = page.locator("#calibration-result").inner_text()
        assert "建議延遲校正" in result_text, result_text
        assert not page.locator("#calibration-apply").is_disabled(), result_text

        page.locator("#calibration-apply").click()
        assert page.locator("#calibration-overlay").is_hidden()
        applied = int(page.locator("#offset-slider").input_value())
        assert 30 <= applied <= 70, (
            f"injected +50ms lag but the wizard applied {applied}ms: {result_text}"
        )

        saved = page.evaluate("JSON.parse(localStorage.getItem('moonlit-arcana-save'))")
        assert saved["settings"]["audioOffsetMs"] == applied, saved["settings"]

        # The applied offset must shift judgment time; a reload must keep it.
        page.reload(wait_until="networkidle")
        assert int(page.locator("#offset-slider").input_value()) == applied

        assert not page_errors, f"Page errors: {page_errors}"
        browser.close()

    print(f"LATENCY_WIZARD_E2E_OK applied {applied}ms for an injected 50ms lag")


if __name__ == "__main__":
    main()
