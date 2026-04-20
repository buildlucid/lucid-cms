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
		if (!text) {
			return {
				ok: true,
				data: undefined,
			};
		}

		return {
			ok: true,
			data: JSON.parse(text),
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
