import type {
	Collection,
	InternalCollectionDocument,
	Refs,
	ResolvedAdminCopy,
} from "@lucidcms/types";
import type { FieldState } from "../../extensions/editor/types.js";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { documentListSlotPolicies } from "./constants.js";

export type DocumentListSlot = keyof typeof documentListSlotPolicies;

export type DocumentListSlotPlacement =
	| {
			/** Adds a column to the document list. */
			slot: "documentList.column";
			match?: { collection?: string };
			column: { label: string | ResolvedAdminCopy };
	  }
	| {
			/** Replaces a field's cell in the document list. */
			slot: "field.cell";
			match: { collection?: string; field: string };
	  };

/** Listing data only: extensions do not fetch full documents for every row. */
export type DocumentListSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly key: string;
	readonly document: Readonly<InternalCollectionDocument>;
	readonly collection: Readonly<Collection>;
	readonly contentLocale: string;
	readonly refs: Readonly<Refs> | undefined;
	readonly options: TOptions;
} & (
	| { readonly slot: "documentList.column" }
	| { readonly slot: "field.cell"; readonly field: FieldState }
);
