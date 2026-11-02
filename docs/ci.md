# CI — Android Emulator Tests on GitHub Actions

The suite runs on GitHub Actions against a **virtual Android device** (emulator), installing
the APK you choose on **every run**. Workflow file:
[`.github/workflows/android-emulator.yml`](../.github/workflows/android-emulator.yml).

No test, Page Object or config code is CI-specific: the workflow only provides a running
emulator and sets `ANDROID_APP`; [`mobilewright.config.ts`](../mobilewright.config.ts) does the rest.

---

## At a glance

| What | Value |
|---|---|
| Runs on | `ubuntu-latest` (4 vCPU, 16 GB) |
| Triggers | Every push to `poc1`; manually ("Run workflow" / `gh workflow run`) |
| Emulator | API 34, `google_apis`, x86_64, Pixel 6 profile, 4 cores, 4 GB RAM, headless |
| Target | `npm run test:android-emulator` (project `android-emulator`) |
| APK | Asset of a GitHub Release; tag = `apk_tag` input, else repo variable `POC1_APK_TAG` |
| Results | Artifacts `mobilewright-report` (HTML) and `test-results` (videos, failure trees), kept 14 days |
| Duration | ~4–5 min with a warm emulator cache; a few minutes more when the cache is rebuilt |

---

## The pipeline

```
push to poc1 / manual run
        │
        ▼
┌─ verify ───────────────┐   npm ci → npm run verify (types, ESLint, conventions)
└────────────────────────┘   fails fast: the slow emulator job never starts
        │
        ▼
┌─ e2e ──────────────────────────────────────────────────────────────────┐
│ 1. checkout, Node 24, npm ci                                           │
│ 2. Download the APK under test  → build/<file>.apk, ANDROID_APP=<abs>  │
│ 3. Enable KVM                   (hardware acceleration for the CPU)    │
│ 4. Restore AVD cache                                                   │
│ 5. Create AVD + snapshot        (only on a cache miss)                 │
│ 6. Save AVD cache               (only on a cache miss)                 │
│ 7. Run tests on the emulator    boot → npm run test:android-emulator   │
│ 8. Upload report + test-results (always, even when tests fail)         │
└────────────────────────────────────────────────────────────────────────┘
```

Pushing again while a run is in progress cancels the older run (`concurrency`).

---

## How the emulator is set up

The runner image already has the **Android SDK** (`/usr/local/lib/android/sdk`: `sdkmanager`,
`adb`, Java), but no system image or virtual device. The
[`reactivecircus/android-emulator-runner`](https://github.com/ReactiveCircus/android-emulator-runner)
action provides them:

1. Installs the missing SDK packages: platform `android-34`, the emulator, and the system
   image `system-images;android-34;google_apis;x86_64`.
2. Creates a virtual device (AVD) named `test` with the profile, cores and RAM from the
   workflow's `env:`.
3. Boots it headless (`-no-window`, software rendering `-gpu swiftshader_indirect`), waits
   for `sys.boot_completed`, and turns animations off.
4. Runs the `script:` (our tests), then shuts the emulator down.

**Caching.** On a cache miss, step 5 boots the emulator once and saves a snapshot; step 6
stores it (~2.3 GB) under a key built from the API level, target, arch, profile, cores and
RAM. Later runs restore it and boot from the snapshot in seconds. Changing any of those
settings changes the key, so a new snapshot is built automatically. Restore and save are
separate steps so the cache is saved even when the tests then fail.

---

## How the APK is installed

Two parts:

1. **The workflow fetches the file.** "Download the APK under test" resolves the tag
   (`apk_tag` input, else `POC1_APK_TAG`), runs `gh release download <tag> --pattern '*.apk'`
   into `build/`, checks the archive with `unzip -tq`, and exports `ANDROID_APP` as an
   **absolute** path. The job summary records the tag, file name, size and SHA-256, so
   every run says exactly which build it tested.
2. **Mobilewright installs it.** The config's `installApps: env('ANDROID_APP')` makes
   Mobilewright install the file (via `mobilecli` → `adb install`) before the first test.
   Every test then launches the app by `bundleId` (`com.example.scb_automation_app`).

**Clean install every run.** The cached snapshot was taken before any APK existed, and the
test step boots with `-no-snapshot-save`, so each run starts from an emulator without the
app and installs only the build for that tag.

---

## Testing a new APK build

Each build is a GitHub Release holding **exactly one** `.apk` (`*.apk` is git-ignored, so
builds never enter Git history).

```bash
# 1. Publish the build as a release
gh release create poc1-apk-<yyyy-mm-dd> app-release.apk --prerelease \
  --title "poc1 APK <yyyy-mm-dd>" --notes "<build info>"

# 2a. Make it the default for every following run …
gh variable set POC1_APK_TAG --body poc1-apk-<yyyy-mm-dd>

# 2b. … or test it once without changing the default
gh workflow run android-emulator.yml --ref poc1 -f apk_tag=poc1-apk-<yyyy-mm-dd>
```

The release's package name must match `bundleId` in the config, and the APK must include
an `x86_64` build (the emulator's CPU). Flutter release APKs built without `--target-platform`
include it.

---

## Running it manually

`workflow_dispatch` is GitHub's **manual trigger**: it adds a **Run workflow** button on
the Actions tab, with a form for the two inputs:

| Input | Default | Meaning |
|---|---|---|
| `apk_tag` | empty → `POC1_APK_TAG` | Release tag whose `.apk` is installed |
| `api_level` | `34` | Android API level of the emulator |

From a terminal:

```bash
gh workflow run android-emulator.yml --ref poc1 -f apk_tag=<tag> -f api_level=34
gh run watch
```

> **The button only appears when the workflow file also exists on the default branch
> (`main`).** GitHub lists workflows from `main`; the run itself uses the version on the
> branch you pick in "Use workflow from" (choose `poc1`). Until the file is on `main`,
> runs come only from pushes to `poc1`, and `gh workflow run` answers
> `workflow android-emulator.yml not found on the default branch`.

---

## Reading the results

- **Run page → Summary:** pass/fail per job, and the "APK under test" table.
- **Artifacts:** `mobilewright-report` (open `index.html`) and `test-results` (a video per
  test, plus the screenshot and view tree of failures). From a terminal:
  ```bash
  gh run download <run-id> -n mobilewright-report
  npx mobilewright show-report mobilewright-report
  ```
- **Failed step log only:** `gh run view <run-id> --log-failed`.

---

## Troubleshooting

Failures seen while setting this up, and what they mean:

| Symptom (in the "Run tests" log) | Cause | Fix |
|---|---|---|
| `adb: failed to stat build/<file>.apk: No such file or directory` on every test | `ANDROID_APP` was a relative path; `mobilecli` runs `adb` from its own working directory | Keep the absolute path (`realpath`) in the download step |
| `Test timeout of 60000ms exceeded`, the test's steps all passed but slowly (taps of several seconds) | Emulator too slow: software rendering on the action's default 2 cores | Emulator runs with `cores: 4` / `ram-size: 4096M`. Don't raise test timeouts to hide it (AGENTS.md §7) |
| "Create AVD and snapshot" runs on every run | No cache saved for the current key (first run, or emulator settings changed) | Expected once per key; check `gh cache list` for `avd-…` |
| `No APK tag: pass the apk_tag input or set the repo variable POC1_APK_TAG.` | Neither the input nor the variable is set | `gh variable set POC1_APK_TAG --body <tag>` |
| `Release <tag> must hold exactly one .apk` | The release has zero or several `.apk` assets | One `.apk` per release |
| `verify` job fails | Same checks as local `npm run verify` | See [static-analysis.md](static-analysis.md) |

**Timing headroom.** Software-rendered emulators are much slower than a phone. The Phase 3
form test (date picker) takes ~58 s of its 60 s budget on CI, so it is the first test to
break if the emulator gets slower. If it starts timing out, make the flow faster (fewer
taps in the date picker) rather than raising the timeout.

---

## Notes

- `.github/` is outside the framework's conventions: ESLint and
  `scripts/check-conventions.mjs` skip it.
- The repo is public, so releases (APKs), artifacts and the test accounts in `data/` are
  public. Fine for the poc1 demo app; a real app needs a private repo, an access-controlled
  APK source and credentials in GitHub secrets.
- Actions are pinned to major versions (`@v7`, `@v2.38.0`). For a production app, pin them
  to commit SHAs and let Dependabot update them.
