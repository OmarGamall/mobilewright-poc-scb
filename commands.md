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
  
  # Run tests whose title matches a regex (there is no -g short flag)
  npx mobilewright test --grep "test title name"
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
  *Android only for now. The app (`BUNDLE_ID`) must be in the foreground.*

- **Dump UI Tree (raw, unfiltered — rarely needed directly):**
  ```bash
  npx mobilecli dump ui --device <DEVICE_ID>
  ```
  *The raw accessibility tree, system UI included. `npm run extract -- <slug> --raw` saves the same next to the evidence.*

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
