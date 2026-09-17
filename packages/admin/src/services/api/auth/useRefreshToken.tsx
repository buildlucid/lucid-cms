import { csrfReq } from "@/services/api/auth/useCsrf";
import {
	getRequestInterfaceLocale,
	interfaceLocaleHeader,
} from "@/translations";

let refreshPromise: Promise<boolean> | undefined;

/** Concurrent requests share one refresh attempt. Request retries are bounded by the caller. */
export const refreshTokenReq = (): Promise<boolean> => {
	refreshPromise ??= (async () => {
		const csrfToken = await csrfReq();
		const locale = getRequestInterfaceLocale();

		const response = await fetch("/lucid/api/v1/auth/token", {
			method: "POST",
			credentials: "include",
			headers: {
				"X-CSRF-Token": csrfToken ?? "",
				...(locale ? { [interfaceLocaleHeader]: locale } : {}),
			},
		});
		return response.status === 204;
	})().finally(() => {
		refreshPromise = undefined;
	});
	return refreshPromise;
};
