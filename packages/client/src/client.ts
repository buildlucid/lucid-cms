import {
	createAccountClient,
	type LucidAccountClient,
} from "./resources/account.js";
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
	/** Account endpoint available to user-scoped credentials. */
	account: LucidAccountClient;
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
 * Returns a client for Lucid's external content endpoints.
 *
 * @example
 * ```ts
 * import { createClient } from "@lucidcms/client";
 *
 * const client = createClient({
 * 	baseUrl: "https://example.com",
 * 	auth: {
 * 		type: "apiKey",
 * 		apiKey: "<your-integration-key>",
 * 	},
 * });
 *
 * const page = await client.documents.getSingle({
 * 	collectionKey: "page",
 * 	version: "published",
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
		account: createAccountClient(transport),
		documents: createDocumentsClient(transport),
		locales: createLocalesClient(transport),
		media: createMediaClient(transport),
		previews: createPreviewsClient(transport),
	};
};
