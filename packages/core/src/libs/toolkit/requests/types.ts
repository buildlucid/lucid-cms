import type z from "zod";
import type { CollectionDocumentKey } from "../../../exports/types.js";
import type { RequestType } from "../../../libs/db/tables/requests.js";
import type { ToolkitDocumentVersion } from "../documents/index.js";
import type { inputSchema as acknowledgeSchema } from "./acknowledge/schema.js";

/**
 * A document to add to a request, with versions typed for its collection and
 * the fields its request type takes. Update requests always copy and change
 * latest, and delete requests bin the whole document.
 */
export type ToolkitRequestDocument<
	K extends CollectionDocumentKey = CollectionDocumentKey,
	TType extends ToolkitRequestType = ToolkitRequestType,
> = TType extends "publish"
	? {
			collectionKey: K;
			documentId: number;
			/** Latest or an environment to publish from. Fixed once added. */
			source: ToolkitDocumentVersion<K>;
			/** Environments after the source to publish to. */
			targets: ToolkitEnvironment<K>[];
		}
	: TType extends "unpublish"
		? {
				collectionKey: K;
				documentId: number;
				/** Environments to remove the document from. */
				targets: ToolkitEnvironment<K>[];
			}
		: { collectionKey: K; documentId: number };

/** Request types the toolkit opens with `requests.createSingle`. Create requests come from `documents.createSingle`. */
export type ToolkitRequestType = Exclude<RequestType, "create">;

/** A collection's configured environments. */
type ToolkitEnvironment<K extends CollectionDocumentKey> = Exclude<
	ToolkitDocumentVersion<K>,
	"latest"
>;

/** One of a request document's targets. */
export type ToolkitRequestTarget = NonNullable<
	z.infer<typeof acknowledgeSchema>["targets"]
>[number];
