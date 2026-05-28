import { createSignal } from "solid-js";
import { csrfReq } from "@/services/api/auth/useCsrf";
import T, {
	getRequestInterfaceLocale,
	interfaceLocaleHeader,
} from "@/translations";
import { LucidError } from "@/utils/error-handling";
import request, { getFetchURL, type RequestParams } from "@/utils/request";

const [getRunning, setRunning] = createSignal(false);
const [refreshTokenPromise, setRefreshTokenPromise] =
	createSignal<Promise<boolean> | null>(null);

const useRefreshToken = async <Response, Data = unknown>(
	params: RequestParams<Data>,
): Promise<Response> => {
	if (getRunning()) {
		await refreshTokenPromise();
		return request(params);
	}

	setRunning(true);

	const promise = refreshTokenReq();
	setRefreshTokenPromise(() => promise);

	const successful = await promise;
	setRunning(false);
	setRefreshTokenPromise(null);

	if (!successful) {
		throw new LucidError(T()("errors.auth.refresh.token.fetch.failed"), {
			status: 401,
			name: T()("errors.auth.unauthorized"),
			message: T()("errors.auth.refresh.token.fetch.failed"),
		});
	}

	return request(params);
};

export const refreshTokenReq = async (): Promise<boolean> => {
	const fetchURL = getFetchURL("/lucid/api/v1/auth/token");
	const csrfToken = await csrfReq();
	const interfaceLocale = getRequestInterfaceLocale();

	const refreshRes = await fetch(fetchURL, {
		method: "POST",
		credentials: "include",
		headers: {
			"X-CSRF-Token": csrfToken || "",
			...(interfaceLocale ? { [interfaceLocaleHeader]: interfaceLocale } : {}),
		},
	});

	return refreshRes.status === 204;
};

export default useRefreshToken;
