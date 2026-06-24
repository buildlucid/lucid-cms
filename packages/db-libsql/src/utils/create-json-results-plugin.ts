import { ParseJSONResultsPlugin } from "kysely";

const shouldParseJSONResult = (value: string) => {
	try {
		// Avoid Kysely logging false positives like "[REDACTED]".
		JSON.parse(value);
		return true;
	} catch {
		return false;
	}
};

export default function createJSONResultsPlugin() {
	return new ParseJSONResultsPlugin({
		shouldParse: shouldParseJSONResult,
	});
}
