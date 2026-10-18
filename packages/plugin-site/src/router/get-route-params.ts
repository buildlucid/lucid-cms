import type { MatchedRoute } from "rou3";
import decode from "../utils/decode.js";

const getRouteParams = (match: MatchedRoute<unknown>) =>
	Object.fromEntries(
		Object.entries(match.params ?? {}).map(([key, value]) => [
			key,
			decode(value),
		]),
	);

export default getRouteParams;
