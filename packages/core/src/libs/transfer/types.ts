import type {
	TransferEntry,
	TransferFile,
	TransferImportMode,
	TransferItemStatus,
	TransferRefs,
} from "@lucidcms/types";
import type z from "zod";
import type { documentSelectionSchema } from "../../services/documents/transfer/schema.js";
import type { MediaUploadFile } from "../../services/media/helpers/upload-file.js";
import type { mediaSelectionSchema } from "../../services/media/transfer/schema.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { CopyInput } from "../i18n/types.js";
import type { ToolkitActor } from "../permission/toolkit-actor.js";

/** A bundled file for an import: already in storage from a browser upload, or bytes from a script. */
export type TransferFileSource =
	| { type: "upload"; key: string }
	| { type: "body"; file: MediaUploadFile };

/** Reads a file bundled with an export, by its path in the bundle, eg. `files/<uid>.webp`. */
export type TransferFileReader = (
	path: string,
) => Promise<MediaUploadFile | undefined>;

export type TransferExportProps = {
	actor: ToolkitActor;
	/** IDs on this site, as written in `refs`, eg. `pages:12` for documents. */
	ids: string[];
	/** True for records added because exported entries link to them. Leave out any you can't export instead of failing. */
	linked: boolean;
	/**
	 * Resolves linked records to portable identities and includes media, plus documents when
	 * requested.
	 */
	link: (targets: Record<string, string[]>) => ServiceResponse<TransferRefs>;
};

export type TransferImportProps<TEntry extends TransferEntry> = {
	actor: ToolkitActor;
	entry: TEntry;
	/** ID of the record on this site with the entry's uid, if there is one. Entries that match are skipped before this runs when `mode` is `skip`. */
	existing: string | undefined;
	/** What to do with entries already on this site, for definitions that also match records another way. */
	mode: TransferImportMode;
	/** Resolves a source ref to a local ID, or null if unavailable. */
	resolve: (resource: string, id: string) => string | null;
	/** True once `resolve` has held back a link to an entry later in the same import. */
	heldBack: () => boolean;
	/** Reads the entry's bundled file, if it has one. */
	file: () => Promise<TransferFileSource | undefined>;
	/** Checks the entry without saving anything. */
	dryRun: boolean;
};

export type TransferImportOutcome = {
	status: Exclude<TransferItemStatus, "failed">;
	/** The record's ID on this site, once saved. */
	id: string | null;
	warnings: string[];
};

/**
 * Describes how one kind of record is exported and imported. Core defines documents, media,
 * users and emails this way; projects and plugins register their own through `transfers` in config.
 * @remarks Handlers use method syntax so definitions with specific entry types stay assignable.
 */
export type TransferDefinitionInput<
	TKey extends string = string,
	TEntry extends TransferEntry = TransferEntry,
	TSelection = unknown,
> = {
	/** Section key in export files. Plugins use their package name, eg. `@acme/lucid-bookings`. */
	readonly key: TKey;
	/** Names shown in import rows and messages. */
	readonly label: { singular: CopyInput; plural: CopyInput };
	/** Checks this section's entries before importing them. Required with `import`. */
	readonly entry?: z.ZodType<TEntry>;
	/** Checks what callers select to export and turns it into IDs. Required with `export`. */
	readonly selection?: z.ZodType<string[], TSelection>;
	/** When exported entries link to these records, add them to the export always, or only when linked records are asked for. Defaults to never. */
	readonly include?: "always" | "linked";
	/** Reuse matching records when importing copies, eg. media files, instead of creating new ones. */
	readonly reuse?: boolean;
	/** Portable identities for records on this site, keyed by ID. Leave out records other entries can't link to. */
	identify(
		context: ServiceContext,
		props: { ids: string[] },
	): ServiceResponse<Map<string, string>>;
	/** IDs on this site for portable identities, keyed by uid. Leave out records entries can't link to. */
	match(
		context: ServiceContext,
		props: { uids: string[]; sameSite: boolean },
	): ServiceResponse<Map<string, string>>;
	/** Builds entries for records on this site. */
	export?(
		context: ServiceContext,
		props: TransferExportProps,
	): ServiceResponse<TEntry[]>;
	/** Creates or updates one entry, or checks it without saving when `dryRun`. */
	import?(
		context: ServiceContext,
		props: TransferImportProps<TEntry>,
	): ServiceResponse<TransferImportOutcome>;
	/** Short name for an entry in import rows. Defaults to its uid. */
	describe?(entry: TEntry): string;
};

/** A transfer definition returned by `defineTransfer`. */
export type TransferDefinition<
	TKey extends string = string,
	TEntry extends TransferEntry = TransferEntry,
	TSelection = unknown,
> = TransferDefinitionInput<TKey, TEntry, TSelection> & {
	readonly type: "transfer-definition";
};

/**
 * What each resource accepts when exporting through the toolkit. Plugins merge their
 * selection types into this interface through module augmentation.
 */
export interface TransferSelections {
	documents: z.input<typeof documentSelectionSchema>;
	media: z.input<typeof mediaSelectionSchema>;
}

/** An export file as Lucid builds it, with entries for any resource. */
export type TransferExportFile = Omit<TransferFile, "resources"> & {
	resources: Record<string, TransferEntry[]>;
};
