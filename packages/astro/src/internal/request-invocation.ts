import type { LucidInvocation } from "@lucidcms/core/types";

const invocationSymbol = Symbol.for("@lucidcms/astro:invocation");

type InvocationLocals = {
	[invocationSymbol]?: Promise<LucidInvocation>;
};

/** Creates or reuses the toolkit invocation on `Astro.locals`, keeping live resources within the current request. */
export const getRequestInvocation = (
	locals: object,
	create: () => Promise<LucidInvocation>,
) => {
	const target = locals as InvocationLocals;
	const existing = target[invocationSymbol];
	if (existing) return existing;

	const invocation = create();
	Object.defineProperty(target, invocationSymbol, {
		value: invocation,
		configurable: true,
	});
	// A failed start isn't kept, so a later call in the request can try again.
	invocation.catch(() => {
		delete target[invocationSymbol];
	});

	return invocation;
};

/** Returns whether the current Astro request created an invocation. */
export const hasRequestInvocation = (locals: object) =>
	invocationSymbol in locals;

/** Destroys the invocation the current Astro request created, if any. */
export const destroyRequestInvocation = async (locals: object) => {
	const target = locals as InvocationLocals;
	const invocation = target[invocationSymbol];
	if (!invocation) return;

	delete target[invocationSymbol];
	await (await invocation.catch(() => undefined))?.destroy();
};
