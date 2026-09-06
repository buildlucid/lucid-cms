import type { Account } from "@lucidcms/types";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";

export type AccountGetInput = {
	request?: LucidRequestOptions;
};

export type AccountGetResponse = LucidClientResponse<Account>;

export interface LucidAccountClient {
	/** Fetches the account associated with the configured user credential. */
	get(input?: AccountGetInput): Promise<AccountGetResponse>;
}

/** Creates the account resource used by the public Lucid client. */
export const createAccountClient = (
	transport: LucidTransport,
): LucidAccountClient => ({
	get: async (input = {}) =>
		await transport.request<Account>({
			operation: "account.get",
			method: "GET",
			path: "/account",
			request: input.request,
		}),
});
