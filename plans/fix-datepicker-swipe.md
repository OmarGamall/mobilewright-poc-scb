# Fix `ExtendedMobileScreen` incorrect `Screen` extension

## Goal
Fix the TypeScript compiler error in `components/DatePicker.ts` where `ExtendedMobileScreen` incorrectly extends `Screen` due to incompatible `swipe` method signatures.

The error message reveals that `Screen.swipe` is now typed as `(direction: SwipeDirection, opts?: SwipeOptions) => Promise<void>` in the core framework, meaning the framework natively supports the `swipe` method and expects the direction as a positional argument rather than an options object.

We will remove the redundant `ExtendedMobileScreen` interface and use `this.screen.swipe` natively with the correct positional argument.

## Files to modify
- `components/DatePicker.ts`

## Proposed Changes

### 1. `components/DatePicker.ts`

**Step A:** Remove `ExtendedMobileScreen` interface definition (Lines 5-8).

```diff
-/** Extended screen interface to correctly type the mobile swipe method */
-interface ExtendedMobileScreen extends Screen {
-  swipe: (options: { direction: 'down' | 'up' }) => Promise<void>;
-}
-
 /** Extended locator interface to correctly type the text extraction method */
 interface ExtendedLocator extends Locator {
   getText: () => Promise<string>;
```

**Step B:** Update `scrollYears` method to use the native `Screen.swipe` correctly without casting (Lines 197-200).

```diff
   private async scrollYears(direction: 'older' | 'newer'): Promise<void> {
-    const mobileScreen = this.screen as unknown as ExtendedMobileScreen;
-    await mobileScreen.swipe({ direction: direction === 'older' ? 'down' : 'up' });
+    await this.screen.swipe(direction === 'older' ? 'down' : 'up');
     
     // Acceptable setTimeout per AGENTS.md rule: Wait for scroll animation to physically stop 
     // because Flutter provides no layout-stable event hook here.
```

## Verification
- Run typescript compilation (or standard framework type-checking command) to verify the error is resolved.
- Run the tests to ensure that all of them pass.
- A quick review to make sure `this.screen.swipe` fulfills the requirement.
