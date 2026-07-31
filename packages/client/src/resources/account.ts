import type { Account, ResponseBody } from "@lucidcms/types";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";

export type AccountGetInput = {
	request?: LucidRequestOptions;
};

export type AccountGetResponse = ResponseBody<Account>;

export interface LucidAccountClient {
	/** Fetches the account associated with the configured user credential. */
	get(
		input?: AccountGetInput,
	): Promise<LucidClientResponse<AccountGetResponse>>;
}

/** Creates the account resource used by the public Lucid client. */
export const createAccountClient = (
	transport: LucidTransport,
): LucidAccountClient => ({
	get: async (input = {}) =>
		await transport.request<AccountGetResponse>({
			operation: "account.get",
			method: "GET",
			path: "/account",
			request: input.request,
		}),
});
