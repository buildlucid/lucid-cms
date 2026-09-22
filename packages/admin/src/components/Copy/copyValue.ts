import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

/**
 * Puts a value on the clipboard and tells the reader it happened. The browser
 * refuses when the page is not trusted or permission is withheld, so the
 * failure is reported rather than left to reject on its own.
 */
export const copyValue = (value: string): void => {
	navigator.clipboard
		.writeText(value)
		.then(() =>
			spawnToast({
				title: T()("toasts.common.copy.to.clipboard.title"),
				status: "success",
			}),
		)
		.catch(() =>
			spawnToast({
				title: T()("toasts.common.copy.to.clipboard.error"),
				status: "error",
			}),
		);
};
