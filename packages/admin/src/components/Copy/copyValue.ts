import { createSignal, onCleanup } from "solid-js";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

/** Copies a value to the clipboard, shows a toast with the result and resolves whether it worked. */
export const copyValue = (value: string): Promise<boolean> =>
	navigator.clipboard
		.writeText(value)
		.then(() => {
			spawnToast({
				title: T()("toasts.common.copy.to.clipboard.title"),
				status: "success",
			});
			return true;
		})
		.catch(() => {
			spawnToast({
				title: T()("toasts.common.copy.to.clipboard.error"),
				status: "error",
			});
			return false;
		});

/**
 * Returns a `copied` flag and a `copy` function for copy buttons. The flag is
 * true for two seconds after a successful copy, so a copy icon can swap to a tick.
 */
export const createCopy = (value: () => string) => {
	const [copied, setCopied] = createSignal(false);
	let resetTimeout: ReturnType<typeof setTimeout> | undefined;

	onCleanup(() => clearTimeout(resetTimeout));

	const copy = async () => {
		if (!(await copyValue(value()))) return;
		setCopied(true);
		clearTimeout(resetTimeout);
		resetTimeout = setTimeout(() => setCopied(false), 2000);
	};

	return [copied, copy] as const;
};
