# Commands Cheatsheet

## Mobilewright Commands
Mobilewright is an end-to-end testing framework for mobile (similar to Playwright).

- **Initialize a new Mobilewright project:**
  ```bash
  npm init mobilewright@latest
  ```

- **Run tests:**
  ```bash
  # Run all tests in the project
  npx mobilewright test
  
  # Run a specific test file
  npx mobilewright test tests/home.spec.ts
  
  # Run a specific test case (by title match)
  npx mobilewright test -g "test title name"
  ```

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
  # Navigate to the target screen on your device first, then:
  npm run extract -- <screen-slug>

  # Examples
  npm run extract -- home
  npm run extract -- login
  npm run extract -- profile-edit
  npm run extract -- home-with-egypt-selected
  ```
  *Outputs two evidence files to `.ui-evidence/`:*
  ```
  ✅ UI Evidence saved for 'home':
     Silver: .ui-evidence/home-tree.json       ← full filtered tree (debug fallback)
     Gold:   .ui-evidence/home-locators.yml    ← flat locator summary (AI POM builder input)
     Token reduction: ~94% (34154 bytes raw → 2035 bytes combined)
  ```

- **Dump UI Tree (raw, unfiltered — rarely needed directly):**
  ```bash
  npx mobilecli dump ui --device AU3N025B20000393
  ```
  *This dumps the raw unfiltered accessibility tree. Use `npm run extract` instead for POM building.*

---

## UI Tree Extraction — AI Prompt Examples

When using the `mobilewright-ui-tree-extractor` agent skill, use these prompts:

```
# Build a new POM from scratch
"Extract the UI tree for the Profile screen (needs login, then tap Profile tab)
and build the ProfilePage POM."

# Update locators after a UI change
"The Home screen UI changed. Re-extract the tree and update HomePage.ts locators only."

# You already have the tree — paste it directly
"Here is my home-locators.yml: [paste content]. Build the HomePage POM from this."

# Logic-only refactor — no extraction needed at all
"Refactor HomePage.ts to combine inputUsername and selectCountry into a single
fillForm(formData) composite method. No locator changes."
```

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
  adb uninstall com.example.package
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
  adb shell am start -n com.example.package/.MainActivity
  ```

- **Clear app data:**
  ```bash
  adb shell pm clear com.example.package
  ```

- **Fetch the DOM / UI Hierarchy of the screen (XML format):**
  ```bash
  adb shell uiautomator dump /sdcard/window_dump.xml
  adb pull /sdcard/window_dump.xml
  ```
  *This dumps the native screen hierarchy (Android's version of a DOM) and pulls it to your computer.*
