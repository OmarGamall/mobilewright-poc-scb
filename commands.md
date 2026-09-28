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

- **Dump UI Tree (Accessibility JSON format):**
  ```bash
  npx mobilecli dump ui --device AU3N025B20000393
  ```
  *This dumps the JSON object of the accessibility tree using Mobilewright's underlying CLI tool.*

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
