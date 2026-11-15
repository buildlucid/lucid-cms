import type z from "zod";
import type {
	CollectionDocumentPatch,
	DocumentEditToken,
	DocumentWriteDestination,
} from "../types.js";
import type { inputSchema } from "./schema.js";

/** Changes to apply in order to latest, the request proposal selected by `requestId`, or a new update request with `request`. */
export type ToolkitDocumentsPatchSingleInput<
	TCollectionKey extends string = string,
> = Omit<
	z.input<typeof inputSchema>,
	"ifUnchanged" | "collectionKey" | "operations" | "requestId" | "request"
> &
	DocumentWriteDestination & {
		collectionKey: TCollectionKey;
		/** Reject the write if this token no longer matches the content being edited. */
		ifUnchanged?: DocumentEditToken;
		operations: CollectionDocumentPatch<TCollectionKey>[];
	};
