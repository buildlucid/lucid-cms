import { createSignal } from "solid-js";

const [pending, setPending] = createSignal<Promise<boolean>>();
let resolvePending: ((_confirmed: boolean) => void) | undefined;

/**
 * Shares one modal across concurrent requests. Resolves true after confirmation, false on
 * dismissal.
 */
function request(): Promise<boolean> {
	const current = pending();
	if (current) return current;

	const next = new Promise<boolean>((resolve) => {
		resolvePending = resolve;
	});
	setPending(next);
	return next;
}

function isOpen(): boolean {
	return pending() !== undefined;
}

/** Closes the modal and resolves waiting requests with the result. */
function finish(confirmed: boolean): void {
	resolvePending?.(confirmed);
	resolvePending = undefined;
	setPending(undefined);
}

const reauthenticationStore = {
	request,
	isOpen,
	finish,
};

export default reauthenticationStore;
