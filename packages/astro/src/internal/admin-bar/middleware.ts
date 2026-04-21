import type { APIContext } from "astro";
import astroConstants from "../../constants.js";
import type { LucidAstroAdminBarOptions } from "../../types.js";
import {
	hasLucidSessionCookies,
	type LucidAdminBarAuthState,
	resolveLucidAdminBarAuthState,
} from "./auth.js";
import { injectLucidAdminBarIntoHtml } from "./html.js";
import {
	normalizeLucidAdminBarOptions,
	readLucidAdminBarContext,
} from "./shared.js";
import {
	buildLucidAdminBarState,
	injectLucidAdminBarStateIntoHtml,
} from "./state.js";

type MaybeInjectLucidAdminBarProps = {
	context: Pick<APIContext, "locals" | "request">;
	response: Response;
	options?: LucidAstroAdminBarOptions;
	isDev: boolean;
	appFetch: (request: Request) => Promise<Response>;
};

const cloneResponseWithSetCookies = (
	response: Response,
	setCookies: string[],
): Response => {
	if (setCookies.length === 0) {
		return response;
	}

	const headers = new Headers(response.headers);
	for (const cookie of setCookies) {
		headers.append("set-cookie", cookie);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};

const resolveProdAuthState = async (props: {
	request: Request;
	appFetch: (request: Request) => Promise<Response>;
}): Promise<LucidAdminBarAuthState> => {
	if (!hasLucidSessionCookies(props.request)) {
		return {
			authenticated: false,
			setCookies: [],
		};
	}

	return resolveLucidAdminBarAuthState(props).catch(() => ({
		authenticated: false,
		setCookies: [],
	}));
};

/**
 * Limits admin bar work to front-end HTML GET responses so Lucid routes, API
 * responses, redirects, and assets stay untouched.
 */
export const shouldInjectLucidAdminBar = (props: {
	pathname: string;
	method: string;
	response: Response;
}): boolean => {
	if (props.method.toUpperCase() !== astroConstants.http.getMethod) {
		return false;
	}

	if (props.pathname.startsWith(astroConstants.paths.mountPath)) {
		return false;
	}

	if (props.response.status >= 300 && props.response.status < 400) {
		return false;
	}

	const contentType = props.response.headers.get("content-type");
	return typeof contentType === "string" && contentType.includes("text/html");
};

/**
 * Applies the final admin bar decision for a response: no-op, dev toolbar
 * state, or the authenticated front-end pill UI.
 */
export const maybeInjectLucidAdminBar = async (
	props: MaybeInjectLucidAdminBarProps,
): Promise<Response> => {
	const options = normalizeLucidAdminBarOptions(props.options);
	if (options.disable) {
		return props.response;
	}

	const pathname = new URL(props.context.request.url).pathname;
	if (
		!shouldInjectLucidAdminBar({
			pathname,
			method: props.context.request.method,
			response: props.response,
		})
	) {
		return props.response;
	}

	const adminBarContext = readLucidAdminBarContext(props.context.locals);
	if (props.isDev) {
		const html = await props.response.text();
		const headers = new Headers(props.response.headers);
		headers.delete("content-length");
		const adminBarState = buildLucidAdminBarState({
			context: adminBarContext,
		});

		return new Response(injectLucidAdminBarStateIntoHtml(html, adminBarState), {
			status: props.response.status,
			statusText: props.response.statusText,
			headers,
		});
	}

	const authState = await resolveProdAuthState({
		request: props.context.request,
		appFetch: props.appFetch,
	});
	if (!authState.authenticated) {
		return cloneResponseWithSetCookies(props.response, authState.setCookies);
	}

	const html = await props.response.text();
	const headers = new Headers(props.response.headers);
	headers.delete("content-length");
	for (const cookie of authState.setCookies) {
		headers.append("set-cookie", cookie);
	}
	const adminBarState = buildLucidAdminBarState({
		context: adminBarContext,
	});

	return new Response(
		injectLucidAdminBarIntoHtml(html, {
			editHref: adminBarState.editHref,
			editLabel: adminBarState.editLabel,
		}),
		{
			status: props.response.status,
			statusText: props.response.statusText,
			headers,
		},
	);
};
