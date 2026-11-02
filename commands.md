# Commands Cheatsheet

## Mobilewright Commands
Mobilewright is an end-to-end testing framework for mobile (similar to Playwright).

- **Initialize a new Mobilewright project:**
  ```bash
  npm init mobilewright@latest
  ```

- **Run tests:**
  ```bash
  # Pick a target (the projects in mobilewright.config.ts; setup, DEVICE_ID and APKs:
  # README › Configuration)
  npm test                          # = android-real
  npm run test:android              # Android real device
  npm run test:android-emulator     # Android emulator

  # Filters: put them after -- so npm passes them on (without it, npm swallows flags)
  npm run test:android -- tests/home.spec.ts                # one file
  npm run test:android -- tests/home.spec.ts:18             # one test, by file:line
  npm run test:android -- --grep "Home Tests"               # describe block title
  npm run test:android -- --grep "open the Profile screen"  # test title (regex)
  npm run test:android -- --grep @smoke                     # tag
  npm run test:android -- --grep-invert "Profile"           # everything except matches
  npm run test:android -- --list                            # list only, no device needed

  # Same thing with the CLI directly (always pass --project)
  npx mobilewright test --project=android-emulator --grep "login"
  ```
  *`--grep` matches the full title path (file › describe › test) plus tags; there is no
  filter by function/class name, no `--tag` and no `-g` flag. Tag a test with
  `test('title', { tag: '@smoke' }, async (...) => {...})`. Without `--project`, every
  defined target runs.*

- **Static checks (no device needed):**
  ```bash
  npm run verify
  ```
  *Runs TypeScript (`tsc --noEmit`), then ESLint, then `scripts/check-conventions.mjs`, and
  stops at the first stage that fails. Must pass before a change is done. What each check
  means: [docs/static-analysis.md](docs/static-analysis.md).*

- **Open the Mobilewright Inspector:**
  ```bash
  npx mobilewright inspect
  ```
  *Tip: Use `--port <port>` to specify a custom port.*

- **View test report:**
  ```bash
  npx mobilewright show-report
  ```

- **Check system readiness / Troubleshoot:**
  ```bash
  npx mobilewright doctor
  ```

- **Extract UI Tree (filtered — for POM building):**
  ```bash
  # Unlock the device, open the app on the target screen and state, then:
  npm run extract -- <screen-slug>          # slug = screen + state
  npm run extract -- <screen-slug> --raw    # also save the unfiltered dump

  # Examples
  npm run extract -- home
  npm run extract -- login
  npm run extract -- home-country-dropdown
  ```
  *Writes to `.ui-evidence/` (local only, never committed):*
  ```
  ✅ UI evidence saved for 'home':
     .ui-evidence/home-locators.yml   ← evidence for locators (roles, labels, positions, warnings)
     .ui-evidence/home.png            ← screenshot of the captured state (not redacted)
  ⚠️  Warnings:
     - keyboard: a text field is focused, so the soft keyboard may be open …
  ```
  *Android only for now. Needs `DEVICE_ID` in `.env`; the app (`bundleId` in
  `mobilewright.config.ts`) must be in the foreground.*

- **Dump UI Tree (raw, unfiltered — rarely needed directly):**
  ```bash
  npx mobilecli dump ui --device <DEVICE_ID>
  ```
  *The raw accessibility tree, system UI included. `npm run extract -- <slug> --raw` saves the same next to the evidence.*

---

## UI Tree Extraction — AI Prompt Examples

See [How to prompt the AI](docs/ai-integration.md#how-to-prompt-the-ai) in the AI
integration guide.

---

## ADB (Android Debug Bridge) Commands
ADB is a versatile command-line tool that lets you communicate with an Android device or emulator.

- **List connected devices:**
  ```bash
  adb devices
  ```
  *Shows a list of attached devices and their states.*

- **Install an app (APK):**
  ```bash
  adb install path/to/app.apk
  ```

- **Uninstall an app:**
  ```bash
  adb uninstall <bundle-id>
  ```
  *Tip: Use `-k` to keep the data and cache directories around.*

- **Open a shell on the device:**
  ```bash
  adb shell
  ```

- **View device logs (logcat):**
  ```bash
  adb logcat
  ```
  *Tip: Use `adb logcat -c` to clear the current logs.*

- **Push a file to the device:**
  ```bash
  adb push local/path /remote/path
  ```

- **Pull a file from the device:**
  ```bash
  adb pull /remote/path local/path
  ```

- **Reboot the device:**
  ```bash
  adb reboot
  ```

- **Start an app via shell:**
  ```bash
  adb shell am start -n <bundle-id>/.MainActivity
  ```

- **Clear app data:**
  ```bash
  adb shell pm clear <bundle-id>
  ```

- **Fetch the DOM / UI Hierarchy of the screen (XML format):**
  ```bash
  adb shell uiautomator dump /sdcard/window_dump.xml
  adb pull /sdcard/window_dump.xml
  ```
  *This dumps the native screen hierarchy (Android's version of a DOM) and pulls it to your computer.*
