import type { Locale } from "@lucidcms/types";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";

export type LocalesGetAllInput = {
	request?: LucidRequestOptions;
};

export type LocalesGetAllResponse = LucidClientResponse<Locale[]>;

export interface LucidLocalesClient {
	/** Fetches every available locale. */
	getAll(input?: LocalesGetAllInput): Promise<LocalesGetAllResponse>;
}

/** Creates the locales resource used by the public Lucid client. */
export const createLocalesClient = (
	transport: LucidTransport,
): LucidLocalesClient => ({
	getAll: async (input = {}) =>
		await transport.request<Locale[]>({
			operation: "locales.getAll",
			method: "GET",
			path: "/locales",
			request: input.request,
		}),
});
