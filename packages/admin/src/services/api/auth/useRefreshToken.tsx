import T from "@/translations";
import { createSignal } from "solid-js";
import request, { type RequestParams, getFetchURL } from "@/utils/request";
import { LucidError } from "@/utils/error-handling";
import { csrfReq } from "@/services/api/auth/useCsrf";

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
		throw new LucidError(T()("error_fetching_refresh_token"), {
			status: 401,
			name: T()("unauthorised"),
			message: T()("error_fetching_refresh_token"),
		});
	}

	return request(params);
};

export const refreshTokenReq = async (): Promise<boolean> => {
	const fetchURL = getFetchURL("/api/v1/auth/token");
	const csrfToken = await csrfReq();

	const refreshRes = await fetch(fetchURL, {
		method: "POST",
		credentials: "include",
		headers: {
			_csrf: csrfToken || "",
		},
	});

	return refreshRes.status === 204;
};

export default useRefreshToken;
