import type { Locale, ResponseBody } from "../generated/core-client-types.js";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";

export type LocalesGetAllInput = {
	request?: LucidRequestOptions;
};

export type LocalesGetAllResponse = ResponseBody<Locale[]>;

export interface LucidLocalesClient {
	/** Returns the Lucid response body for every available locale. */
	getAll(
		input?: LocalesGetAllInput,
	): Promise<LucidClientResponse<LocalesGetAllResponse>>;
}

/**
 * Creates the internal locales resource wrapper used by the root client.
 */
export const createLocalesClient = (
	transport: LucidTransport,
): LucidLocalesClient => ({
	getAll: async (input = {}) =>
		await transport.request<LocalesGetAllResponse>({
			operation: "locales.getAll",
			method: "GET",
			path: "/locales",
			request: input.request,
		}),
});
