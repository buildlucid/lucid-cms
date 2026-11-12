/** Sends a request to the CMS, in-process or over the network. */
export type Transport = (request: Request) => Promise<Response>;

type QueryValue = string | number | boolean;

export type ApiRequest = {
	method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
	/** A path on the CMS, such as `/api/v1/account`. */
	path: string;
	/** A list sends the key once per value, as filters that take several values expect. */
	query?: Record<string, QueryValue | QueryValue[]>;
	/** Sent as JSON. */
	body?: unknown;
	/**
	 * Sends the CSRF token on a GET too, for routes that check it there. Other methods send it unless
	 * this is `false`.
	 */
	csrf?: boolean;
	/** Extra headers, such as a captcha token. */
	headers?: Record<string, string>;
};

export type ApiResponse<Body> = {
	status: number;
	ok: boolean;
	/** The parsed JSON body, or null when the response has none. */
	body: Body;
	headers: Headers;
};

export type Cookie = { name: string; value: string };

/** One visitor to the CMS, with their own cookies, address and rate limits. */
export type Session = {
	/** Sends a raw request with this visitor's cookies. */
	fetch(path: string, init?: RequestInit): Promise<Response>;
	/** Sends a JSON request, adding the CSRF token when it changes something. */
	request<Body = unknown>(request: ApiRequest): Promise<ApiResponse<Body>>;
	/** The CSRF token this visitor sends, for a raw `fetch` that changes something. */
	csrf(): Promise<string>;
	cookies(): Cookie[];
	/** Stores a cookie as if the CMS had set it, such as one copied from another session. */
	setCookie(cookie: Cookie): void;
};

export type Credentials = {
	email: string;
	username: string;
	password: string;
};
