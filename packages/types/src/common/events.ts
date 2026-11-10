import type { MediaType } from "../resources/media/types.js";
import type { RequestType } from "../resources/requests/types.js";

/** Optional event filters, with omitted filters matching all values. */
export interface ContentEventFilter {
	/** Collection keys, matching requests that contain any document in those collections. */
	collections?: string[];
	requestTypes?: RequestType[];
	mediaTypes?: MediaType[];
	/** Only matches updates that changed one of these parts of the media. */
	fields?: "file"[];
}

/**
 * Content event subscription for saved settings such as routines.
 *
 * @remarks Keep events and filters additive so saved settings remain valid.
 */
export type ContentEvent =
	| {
			event: "documents:created" | "documents:updated" | "documents:published";
			filter?: Pick<ContentEventFilter, "collections">;
	  }
	| {
			event:
				| "requests:created"
				| "requests:updated"
				| "requests:approved"
				| "requests:completed";
			filter?: Pick<ContentEventFilter, "collections" | "requestTypes">;
	  }
	| {
			event: "media:created";
			filter?: Pick<ContentEventFilter, "mediaTypes">;
	  }
	| {
			event: "media:updated";
			filter?: Pick<ContentEventFilter, "mediaTypes" | "fields">;
	  };

export type ContentEventName = ContentEvent["event"];
