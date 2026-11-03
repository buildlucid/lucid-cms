import constants from "../constants.js";

/** Calls the GitHub REST API, throwing with GitHub's own message when it refuses the request. */
const githubRequest = async (props: {
	url: string;
	token: string;
	method?: "GET" | "POST";
	body?: unknown;
}) => {
	const response = await fetch(props.url, {
		method: props.method ?? "GET",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${props.token}`,
			"X-GitHub-Api-Version": constants.apiVersion,
			"User-Agent": constants.userAgent,
			...(props.body !== undefined && { "Content-Type": "application/json" }),
		},
		body: props.body !== undefined ? JSON.stringify(props.body) : undefined,
		signal: AbortSignal.timeout(constants.requestTimeoutMs),
	});
	if (response.ok) return response;

	const details: unknown = await response.json().catch(() => null);
	const message =
		typeof details === "object" &&
		details !== null &&
		"message" in details &&
		typeof details.message === "string"
			? details.message
			: response.statusText;
	throw new Error(`GitHub responded with ${response.status}: ${message}`);
};

export default githubRequest;
