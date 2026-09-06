export type ParsedJsonResponse =
	| {
			ok: true;
			data: unknown;
	  }
	| {
			ok: false;
			error: Error;
	  };

/**
 * Parses JSON once from the raw response and returns an explicit success/error result for transport flow.
 */
export const parseJsonResponse = async (
	response: Response,
): Promise<ParsedJsonResponse> => {
	try {
		const text = await response.text();
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
