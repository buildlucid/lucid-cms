import type { PreviewResolution, ResponseBody } from "@lucidcms/types";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";

export type PreviewsResolveInput = {
	token: string;
	request?: LucidRequestOptions;
};

export type PreviewsResolveResponse = ResponseBody<PreviewResolution>;

export interface LucidPreviewsClient {
	/** Validates a preview token and returns its browser runtime metadata. */
	resolve(
		input: PreviewsResolveInput,
	): Promise<LucidClientResponse<PreviewsResolveResponse>>;
}

export const createPreviewsClient = (
	transport: LucidTransport,
): LucidPreviewsClient => ({
	resolve: async (input) =>
		await transport.request<PreviewsResolveResponse>({
			operation: "previews.resolve",
			method: "POST",
			path: "/preview",
			body: { token: input.token },
			request: input.request,
		}),
});
