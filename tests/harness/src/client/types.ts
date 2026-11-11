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
	cookies(): Cookie[];
};

export type Credentials = {
	email: string;
	username: string;
	password: string;
};
