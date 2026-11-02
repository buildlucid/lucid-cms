import type { PublicErrorData } from "../../common/errors.js";
import type { MediaType } from "../media/types.js";

/**
 * Portable identities of the records an entry links to, keyed by resource and then by the
 * record's ID on the source site. Document IDs are written as `<collectionKey>:<id>`.
 */
export type TransferRefs = Record<string, Record<string, string>>;

export interface TransferEntry {
	/** Portable identity used to match the record on any site. */
	uid: string;
	/** What this entry links to, so imports can link the same records on this site. */
	refs?: TransferRefs;
	/** Path of the entry's bundled file, eg. `files/<uid>.webp` in a zip. */
	file?: string;
}

/** Authoring values with every locale, using IDs from the source site. */
export interface TransferDocumentData {
	fields: Record<string, unknown>;
	bricks: {
		fixed: Record<string, Record<string, unknown>>;
		builder: Array<{
			ref: string;
			key: string;
			fields: Record<string, unknown>;
		}>;
		embedded: Array<{
			ref: string;
			key: string;
			fields: Record<string, unknown>;
		}>;
	};
}

export interface TransferDocumentEntry extends TransferEntry {
	collectionKey: string;
	/** The document's label when it was exported. */
	label: string;
	/** Keys of fields the source site stores per locale, for the collection and each brick. Omitted when it isn't localized. */
	localized?: { fields: string[]; bricks: Record<string, string[]> };
	data: TransferDocumentData;
}

/** Text a media file holds by field, with a null locale for text that isn't assigned to one. */
export type TransferMediaText = Partial<
	Record<
		"title" | "alt" | "description" | "summary" | "transcript",
		Array<{ localeCode: string | null; value: string | null }>
	>
>;

/** A media file in an export file, with what an upload can't work out from the file itself. */
export interface TransferMediaEntry extends TransferEntry {
	fileName: string;
	mimeType: string;
	type: MediaType;
	size: number;
	public: boolean;
	/** Folder titles from the top level down. */
	folder: string[];
	meta: {
		width: number | null;
		height: number | null;
		duration: number | null;
		focalPoint: { x: number; y: number } | null;
		blurHash: string | null;
		averageColor: string | null;
		base64: string | null;
		isDark: boolean | null;
		isLight: boolean | null;
	};
	text: TransferMediaText;
	/** Where the source site serves the file. Private files need a login there. */
	url: string | null;
}

/** An export file. Every resource's entries are an array, even for one document. */
export interface TransferFile {
	lucid: { format: 1; version: string };
	source: {
		/** Identifies the site the file came from. */
		instanceId: string;
		url: string;
	};
	exportedAt: string;
	locales: string[];
	resources: {
		documents?: TransferDocumentEntry[];
		media?: TransferMediaEntry[];
		[resource: string]: TransferEntry[] | undefined;
	};
}

/** How importing an entry went, or will go when checking. */
export type TransferItemStatus =
	| "created"
	| "updated"
	| "unchanged"
	| "requested"
	| "skipped"
	| "failed";

/** What to do with entries that are already on this site. */
export type TransferImportMode = "upsert" | "skip" | "copy";

/** The outcome, or planned outcome when checking, of importing one entry. */
export interface TransferItemResult {
	resource: string;
	uid: string;
	label: string;
	status: TransferItemStatus;
	/** The record's ID on this site, once imported. Document IDs are written as `<collectionKey>:<id>`. */
	id: string | null;
	warnings: string[];
	error: PublicErrorData | null;
	/** Retry this entry after its referenced records are imported. */
	retry: boolean;
}

/** A resource an export file can contain. */
export interface TransferResource {
	key: string;
	label: { singular: string; plural: string };
	/** Matching records are reused rather than updated or copied, eg. media files. */
	reuse: boolean;
}

/** The result of checking an export file before importing it. */
export interface TransferImportCheck {
	/** Whether the file was exported from this site. */
	sameSite: boolean;
	resources: TransferResource[];
	/** Planned outcomes, in the order to import the entries. */
	items: TransferItemResult[];
	/** New uids for entries imported as copies, by resource and then by their uid in the file. */
	copies: Record<string, Record<string, string>>;
}
