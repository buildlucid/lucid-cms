import { createSignal, onCleanup } from "solid-js";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

/**
 * Copies text or PNG data, shows a toast and returns success. Pass image promises to preserve
 * Safari's click activation.
 */
export const copyValue = (value: string | Promise<Blob>): Promise<boolean> =>
	(typeof value === "string"
		? navigator.clipboard.writeText(value)
		: navigator.clipboard.write([new ClipboardItem({ "image/png": value })])
	)
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

/** Returns a copy function and a flag that stays true for two seconds after success. */
export const createCopy = (value: () => string | Promise<Blob>) => {
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
