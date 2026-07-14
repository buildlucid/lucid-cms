import type {
	DocumentPreviewResolveResponse,
	ResponseBody,
} from "@lucidcms/types";
import type { LucidClientResponse } from "../types/errors.js";
import type {
	LucidRequestOptions,
	LucidTransport,
} from "../types/transport.js";
import { encodePathSegment } from "../utils/url.js";

export type PreviewsResolveInput = {
	token: string;
	request?: LucidRequestOptions;
};

export type PreviewsResolveResponse =
	ResponseBody<DocumentPreviewResolveResponse>;

export interface LucidPreviewsClient {
	/** Resolves a Lucid preview token to its authorized document version target. */
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
			method: "GET",
			path: `/preview/${encodePathSegment(input.token)}`,
			request: input.request,
		}),
});
