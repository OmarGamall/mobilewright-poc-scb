import { test } from '@mobilewright/test';

type StepOptions = {
  /** Argument indexes rendered as `***` in the title (passwords, tokens). */
  mask?: number[];
  /** Hide the method's internals and report errors at the caller's line. Default `false` (full stack kept). */
  box?: boolean;
};

const MAX_ARG_LENGTH = 60;

/** Stack lines pointing into this file; removed so traces show only POM/spec frames. */
const OWN_FRAME = /[\\/]utils[\\/]step\.ts:\d+|__step_invoke__/;

type Method<This, Args extends unknown[], Ret> = (this: This, ...args: Args) => Promise<Ret>;
type MethodDecorator = <This, Args extends unknown[], Ret>(
  target: Method<This, Args, Ret>,
  context: ClassMethodDecoratorContext<This, Method<This, Args, Ret>>,
) => Method<This, Args, Ret>;

type Invoke = <T, A extends unknown[], R>(fn: (this: T, ...args: A) => R, self: T, args: A) => R;
/**
 * Calls the original method from an unmapped script. Playwright's stack rewriting
 * (Mobilewright runs on Playwright's runner) names a frame after the identifier at
 * its caller's call site (`apply` here); with no source map at the call site it
 * falls back to the function's own name instead.
 * Relies on runner internals: after a Mobilewright/Playwright upgrade, force a
 * failure inside a decorated method and check the report still names it.
 */
const invoke = new Function('fn', 'self', 'args', 'return fn.apply(self, args);\n//# sourceURL=__step_invoke__') as Invoke;

const fmt = (v: unknown): string => {
  if (v === undefined) return '-';
  const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
  return s.length > MAX_ARG_LENGTH ? `${s.slice(0, MAX_ARG_LENGTH - 1)}…` : s;
};

/** Resolves `0` or `0.name.first` against the arguments; a missing property gives `undefined`. */
const resolve = (args: unknown[], path: string): unknown =>
  path
    .split('.')
    .slice(1)
    .reduce<unknown>((v, key) => (v !== null && typeof v === 'object' ? (v as Record<string, unknown>)[key] : undefined), args[Number(path.split('.')[0])]);

const stripOwnFrames = (error: unknown): void => {
  if (error instanceof Error && error.stack) {
    error.stack = error.stack.split('\n').filter((line) => !OWN_FRAME.test(line)).join('\n');
  }
};

/**
 * Wraps an async POM/component method in a `test.step`, so the HTML report shows
 * it as a named step with nested child steps.
 * Use `{0}`, `{1}`, ... in the title to interpolate arguments, and `{0.name}` for
 * a property of one; an omitted argument renders as `-`. Without a title the step
 * is named `ClassName.methodName`. Only async methods can be decorated.
 * @param title Step title template.
 * @param opts Masking and boxing options.
 * @example
 *   @step('Select country "{0}"')
 *   async selectCountry(country: string): Promise<void> { ... }
 */
export function step(title?: string, opts: StepOptions = {}): MethodDecorator {
  return function <This, Args extends unknown[], Ret>(
    target: Method<This, Args, Ret>,
    context: ClassMethodDecoratorContext<This, Method<This, Args, Ret>>,
  ): Method<This, Args, Ret> {
    const methodName = String(context.name);
    // The decorator transform leaves the original method anonymous; name it so the
    // `invoke` fallback above reports `Class.<methodName>`.
    if (target.name !== methodName) Object.defineProperty(target, 'name', { value: methodName });

    const wrapper = async function (this: This, ...args: Args): Promise<Ret> {
      const base = title ?? `${(this as object).constructor.name}.${methodName}`;
      const name = base.replace(/\{(\d+(?:\.\w+)*)\}/g, (_token, path: string) => {
        const idx = Number(path.split('.')[0]);
        return opts.mask?.includes(idx) ? '***' : fmt(resolve(args, path));
      });
      try {
        return await test.step(name, () => invoke(target, this, args), { box: opts.box ?? false });
      } catch (error) {
        stripOwnFrames(error);
        throw error;
      }
    };
    Object.defineProperty(wrapper, 'name', { value: methodName });
    return wrapper;
  };
}
