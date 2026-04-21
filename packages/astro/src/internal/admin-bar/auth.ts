import astroConstants from "../../constants.js";

const lucidAuthCookieNames = {
	access: "_access",
	refresh: "_refresh",
} as const;

export type LucidAdminBarAuthState = {
	authenticated: boolean;
	setCookies: string[];
};

const splitCombinedSetCookieHeader = (value: string): string[] => {
	if (!value.includes(",")) {
		return [value];
	}

	const parts: string[] = [];
	let current = "";
	let inExpires = false;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		const slice = value.slice(index, index + 8).toLowerCase();

		if (slice === "expires=") {
			inExpires = true;
		}

		if (char === ";") {
			inExpires = false;
		}

		if (char === "," && !inExpires) {
			parts.push(current.trim());
			current = "";
			continue;
		}

		current += char;
	}

	if (current.trim()) {
		parts.push(current.trim());
	}

	return parts;
};

const collectSetCookieHeaders = (headers: Headers): string[] => {
	const getSetCookie = Reflect.get(headers, "getSetCookie");
	if (typeof getSetCookie === "function") {
		return (getSetCookie.call(headers) as string[]).filter(Boolean);
	}

	const values: string[] = [];
	for (const [key, value] of headers.entries()) {
		if (key.toLowerCase() !== "set-cookie") continue;
		values.push(...splitCombinedSetCookieHeader(value));
	}

	return values.filter(Boolean);
};

const parseCookieHeader = (value: string | null): Map<string, string> => {
	const jar = new Map<string, string>();
	if (!value) {
		return jar;
	}

	for (const part of value.split(";")) {
		const trimmed = part.trim();
		if (!trimmed) continue;

		const separatorIndex = trimmed.indexOf("=");
		if (separatorIndex < 1) continue;

		jar.set(
			trimmed.slice(0, separatorIndex),
			trimmed.slice(separatorIndex + 1),
		);
	}

	return jar;
};

const serializeCookieJar = (jar: Map<string, string>): string =>
	[...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");

const isExpiredSetCookie = (attributes: string[]): boolean => {
	for (const attribute of attributes) {
		const trimmedAttribute = attribute.trim();
		const separatorIndex = trimmedAttribute.indexOf("=");
		if (separatorIndex < 0) {
			continue;
		}

		const key = trimmedAttribute.slice(0, separatorIndex).trim().toLowerCase();
		const value = trimmedAttribute.slice(separatorIndex + 1).trim();

		if (key === "max-age") {
			const maxAge = Number(value);
			if (Number.isFinite(maxAge) && maxAge <= 0) {
				return true;
			}
		}

		if (key === "expires") {
			const expiresAt = Date.parse(value);
			if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
				return true;
			}
		}
	}

	return false;
};

const applySetCookiesToJar = (
	jar: Map<string, string>,
	setCookies: string[],
): void => {
	for (const cookie of setCookies) {
		const [nameValue, ...attributes] = cookie.split(";");
		if (!nameValue) continue;

		const separatorIndex = nameValue.indexOf("=");
		if (separatorIndex < 1) continue;

		const name = nameValue.slice(0, separatorIndex).trim();
		const value = nameValue.slice(separatorIndex + 1).trim();
		const shouldDelete = isExpiredSetCookie(attributes);

		if (shouldDelete || value.length === 0) {
			jar.delete(name);
			continue;
		}

		jar.set(name, value);
	}
};

const forwardOuterHeaders = (source: Request, target: Headers): void => {
	for (const key of [
		"x-forwarded-for",
		"x-real-ip",
		"cf-connecting-ip",
		"user-agent",
		"accept-language",
	] as const) {
		const value = source.headers.get(key);
		if (value) {
			target.set(key, value);
		}
	}
};

const createInternalLucidRequest = (props: {
	source: Request;
	pathname: string;
	method?: string;
	cookieHeader?: string;
	headers?: HeadersInit;
}): Request => {
	const headers = new Headers(props.headers);
	forwardOuterHeaders(props.source, headers);

	if (props.cookieHeader) {
		headers.set("cookie", props.cookieHeader);
	}

	return new Request(new URL(props.pathname, props.source.url), {
		method: props.method ?? astroConstants.http.getMethod,
		headers,
	});
};

export const hasLucidSessionCookies = (request: Request): boolean => {
	const jar = parseCookieHeader(request.headers.get("cookie"));
	return (
		jar.has(lucidAuthCookieNames.access) ||
		jar.has(lucidAuthCookieNames.refresh)
	);
};

/**
 * Reuses Lucid's existing auth endpoints to resolve whether the current request
 * is authenticated, including token refresh when only a refresh cookie remains.
 */
export const resolveLucidAdminBarAuthState = async (props: {
	request: Request;
	appFetch: (request: Request) => Promise<Response>;
}): Promise<LucidAdminBarAuthState> => {
	const cookieJar = parseCookieHeader(props.request.headers.get("cookie"));
	const hasRefreshToken = cookieJar.has(lucidAuthCookieNames.refresh);
	const serializedCookies = serializeCookieJar(cookieJar);

	if (!serializedCookies) {
		return {
			authenticated: false,
			setCookies: [],
		};
	}

	const forwardedSetCookies: string[] = [];

	const accountResponse = await props.appFetch(
		createInternalLucidRequest({
			source: props.request,
			pathname: `${astroConstants.paths.mountPath}/api/v1/account`,
			cookieHeader: serializedCookies,
			headers: {
				accept: "application/json",
			},
		}),
	);
	if (accountResponse.ok) {
		return {
			authenticated: true,
			setCookies: forwardedSetCookies,
		};
	}

	if (accountResponse.status !== 401 || !hasRefreshToken) {
		return {
			authenticated: false,
			setCookies: forwardedSetCookies,
		};
	}

	const csrfResponse = await props.appFetch(
		createInternalLucidRequest({
			source: props.request,
			pathname: `${astroConstants.paths.mountPath}/api/v1/auth/csrf`,
			cookieHeader: serializeCookieJar(cookieJar),
			headers: {
				accept: "application/json",
			},
		}),
	);
	const csrfSetCookies = collectSetCookieHeaders(csrfResponse.headers);
	applySetCookiesToJar(cookieJar, csrfSetCookies);
	forwardedSetCookies.push(...csrfSetCookies);

	if (!csrfResponse.ok) {
		return {
			authenticated: false,
			setCookies: forwardedSetCookies,
		};
	}

	const csrfPayload = (await csrfResponse.json().catch(() => null)) as {
		data?: {
			_csrf?: string;
		};
	} | null;
	const csrfToken = csrfPayload?.data?._csrf;
	if (!csrfToken) {
		return {
			authenticated: false,
			setCookies: forwardedSetCookies,
		};
	}

	const refreshResponse = await props.appFetch(
		createInternalLucidRequest({
			source: props.request,
			pathname: `${astroConstants.paths.mountPath}/api/v1/auth/token`,
			method: "POST",
			cookieHeader: serializeCookieJar(cookieJar),
			headers: {
				accept: "application/json",
				"X-CSRF-Token": csrfToken,
			},
		}),
	);
	const refreshSetCookies = collectSetCookieHeaders(refreshResponse.headers);
	applySetCookiesToJar(cookieJar, refreshSetCookies);
	forwardedSetCookies.push(...refreshSetCookies);

	if (refreshResponse.status !== 204) {
		return {
			authenticated: false,
			setCookies: forwardedSetCookies,
		};
	}

	const refreshedAccountResponse = await props.appFetch(
		createInternalLucidRequest({
			source: props.request,
			pathname: `${astroConstants.paths.mountPath}/api/v1/account`,
			cookieHeader: serializeCookieJar(cookieJar),
			headers: {
				accept: "application/json",
			},
		}),
	);

	return {
		authenticated: refreshedAccountResponse.ok,
		setCookies: forwardedSetCookies,
	};
};
