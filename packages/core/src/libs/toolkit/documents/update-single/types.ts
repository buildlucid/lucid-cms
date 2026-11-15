import type z from "zod";
import type {
	CollectionDocumentData,
	DocumentEditToken,
	DocumentWriteDestination,
} from "../types.js";
import type { inputSchema } from "./schema.js";

/** Values to save to latest, the `requestId` proposal, or a new update request with `request`, preserving omitted fields. */
export type ToolkitDocumentsUpdateSingleInput<
	TCollectionKey extends string = string,
> = Omit<
	z.input<typeof inputSchema>,
	"ifUnchanged" | "collectionKey" | "data" | "requestId" | "request"
> &
	DocumentWriteDestination & {
		collectionKey: TCollectionKey;
		/** Reject the write if this token no longer matches the content being edited. */
		ifUnchanged?: DocumentEditToken;
		data: CollectionDocumentData<TCollectionKey>;
	};
