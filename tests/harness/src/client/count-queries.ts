const QUERIES = /(?:^|,)\s*db;[^,]*desc="(\d+) queries"/;

/** Reads query counts from `Server-Timing`, enabled for every setup in `shared/config.ts`. */
const countQueries = (response: { headers: Headers }): number => {
	const match = response.headers.get("server-timing")?.match(QUERIES);
	if (!match?.[1]) {
		throw new Error(
			"The response has no query count. Is `http.serverTiming` on in the setup's config?",
		);
	}
	return Number(match[1]);
};

export default countQueries;
