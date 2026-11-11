import { CLIENT_ADDRESS_HEADER } from "../../../shared/config.ts";
import type { ApiRequest, ApiResponse, Session, Transport } from "./types.ts";

const CSRF_HEADER = "x-csrf-token";
const CSRF_PATH = "/api/v1/auth/csrf";

let sessionCount = 0;

/** Gives each session in this process its own address, so their rate limits never mix. */
const nextAddress = (): string => {
	sessionCount++;
	const worker = process.pid % 250;
	return `10.${worker}.${Math.floor(sessionCount / 250) % 250}.${(sessionCount % 250) + 1}`;
};

/** Creates a visitor that keeps cookies between requests, as a browser would. */
const createSession = (options: {
	url: string;
	transport: Transport;
}): Session => {
	const jar = new Map<string, string>();
	const address = nextAddress();
	let csrf: string | undefined;

	const storeCookies = (response: Response) => {
		for (const cookie of response.headers.getSetCookie()) {
			const [pair = "", ...attributes] = cookie.split(";");
			const separator = pair.indexOf("=");
			const name = pair.slice(0, separator).trim();
			const value = pair.slice(separator + 1).trim();
			const expired = attributes.some(
				(attribute) => attribute.trim().toLowerCase() === "max-age=0",
			);

			if (expired || value === "") {
				jar.delete(name);
			} else {
				jar.set(name, value);
			}
		}
	};

	const fetch: Session["fetch"] = async (path, init) => {
		const headers = new Headers(init?.headers);
		headers.set(CLIENT_ADDRESS_HEADER, address);
		if (jar.size > 0) {
			headers.set(
				"cookie",
				[...jar].map(([name, value]) => `${name}=${value}`).join("; "),
			);
		}

		const response = await options.transport(
			new Request(new URL(path, options.url), { ...init, headers }),
		);
		storeCookies(response);
		return response;
	};

	const getCsrf = async (): Promise<string> => {
		if (!csrf) {
			const response = await fetch(CSRF_PATH);
			const body = (await response.json()) as { data: { _csrf: string } };
			csrf = body.data._csrf;
		}
		return csrf;
	};

	const request = async <Body>(
		input: ApiRequest,
	): Promise<ApiResponse<Body>> => {
		const method = input.method ?? "GET";
		const url = new URL(input.path, options.url);
		for (const [key, value] of Object.entries(input.query ?? {})) {
			for (const item of Array.isArray(value) ? value : [value]) {
				url.searchParams.append(key, String(item));
			}
		}

		const headers = new Headers({ accept: "application/json" });
		if (method !== "GET") {
			headers.set(CSRF_HEADER, await getCsrf());
		}
		if (input.body !== undefined) {
			headers.set("content-type", "application/json");
		}

		const response = await fetch(`${url.pathname}${url.search}`, {
			method,
			headers,
			body: input.body === undefined ? undefined : JSON.stringify(input.body),
		});
		const text = await response.text();

		return {
			status: response.status,
			ok: response.ok,
			body: (text === "" ? null : JSON.parse(text)) as Body,
			headers: response.headers,
		};
	};

	return {
		fetch,
		request,
		cookies: () => [...jar].map(([name, value]) => ({ name, value })),
	};
};

export default createSession;
