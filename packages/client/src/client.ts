import {
	createDocumentsClient,
	type LucidDocumentsClient,
} from "./resources/documents.js";
import {
	createLocalesClient,
	type LucidLocalesClient,
} from "./resources/locales.js";
import { createMediaClient, type LucidMediaClient } from "./resources/media.js";
import {
	createPreviewsClient,
	type LucidPreviewsClient,
} from "./resources/previews.js";
import { createTransport } from "./transport/fetcher.js";
import type { CreateClientOptions } from "./types/transport.js";

export interface LucidClient {
	/** Public document collection endpoints. */
	documents: LucidDocumentsClient;
	/** Public locale endpoints. */
	locales: LucidLocalesClient;
	/** Public media endpoints. */
	media: LucidMediaClient;
	/** Public preview endpoints. */
	previews: LucidPreviewsClient;
}

/**
 * Returns a client for Lucid's public client integration endpoints.
 *
 * @example
 * ```ts
 * import { createClient } from "@lucidcms/client";
 *
 * const client = createClient({
 * 	baseUrl: "https://example.com",
 * 	apiKey: "<your-client-api-key>",
 * });
 *
 * const page = await client.documents.getSingle({
 * 	collectionKey: "page",
 * 	query: {
 * 		filter: {
 * 			_fullSlug: {
 * 				value: "/about",
 * 			},
 * 		},
 * 	},
 * });
 * ```
 */
export const createClient = (options: CreateClientOptions): LucidClient => {
	const middleware = [...(options.middleware ?? [])];
	const transport = createTransport(options, middleware);

	return {
		documents: createDocumentsClient(transport),
		locales: createLocalesClient(transport),
		media: createMediaClient(transport),
		previews: createPreviewsClient(transport),
	};
};
