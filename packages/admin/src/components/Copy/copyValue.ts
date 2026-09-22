import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

/** Copies a value to the clipboard and shows a toast with the result. */
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
