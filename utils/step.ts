import { test } from '@mobilewright/test';

type StepOptions = { mask?: number[] };

const fmt = (v: unknown) =>
  typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);

/**
 * Decorator to wrap POM/Component methods in a `test.step`.
 * Use `{0}`, `{1}` etc. in the template string to interpolate arguments.
 * `box: true` ensures errors point to the call site in the spec file.
 */
export function step(template?: string, opts: StepOptions = {}) {
  return function <This, Args extends unknown[], Ret>(
    target: (this: This, ...args: Args) => Promise<Ret> | Ret,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Ret> | Ret>
  ) {
    return async function (this: This, ...args: Args): Promise<Ret> {
      const base = template ?? `${(this as object).constructor.name}.${String(context.name)}`;
      const name = base.replace(/\{(\d+)\}/g, (token, i) => {
        const idx = Number(i);
        if (idx >= args.length) return token;
        return opts.mask?.includes(idx) ? '***' : fmt(args[idx]);
      });
      
      return await test.step(name, async () => await target.call(this, ...args), { box: true });
    };
  };
}
