import type { LucidResponseType } from "../../types/transport.js";

export type ParsedResponse =
	| {
			ok: true;
			data: unknown;
	  }
	| {
			ok: false;
			error: Error;
	  };

/**
 * Reads the body once and returns an explicit success/error result for transport flow. Successful
 * text responses stay text; other bodies are parsed as JSON, which must include data on success.
 */
export const parseResponse = async (
	response: Response,
	responseType: LucidResponseType = "json",
): Promise<ParsedResponse> => {
	try {
		const text = await response.text();
		if (responseType === "text" && response.ok) {
			return {
				ok: true,
				data: text,
			};
		}

		const data: unknown = text ? JSON.parse(text) : undefined;
		if (
			response.ok &&
			(typeof data !== "object" || data === null || !("data" in data))
		) {
			throw new TypeError("Lucid's response body must include data.");
		}

		return {
			ok: true,
			data,
		};
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error
					? error
					: new Error("Failed to parse response body."),
		};
	}
};
