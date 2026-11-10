import type { AdminOptions } from "../../extensions/types/config.js";
import type {
	documentSidebarSections,
	documentSidebarSlotPolicies,
} from "./constants.js";

export type DocumentSidebarSlot = keyof typeof documentSidebarSlotPolicies;

export type DocumentSidebarSectionKey =
	(typeof documentSidebarSections)[number];

/** Where a plugin section sits, next to one of the built-in sections. */
export type DocumentSidebarPosition =
	| { before: DocumentSidebarSectionKey }
	| { after: DocumentSidebarSectionKey };

export type DocumentSidebarSlotPlacement = {
	/** Adds a section to the document sidebar. Render it with `DocumentSidebarSection`. */
	slot: "document.sidebar";
	match?: { collection?: string };
	/** @default { after: "details" } */
	position?: DocumentSidebarPosition;
};

/** Read the open document with `useDocumentEditor()`. */
export type DocumentSidebarSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: "document.sidebar";
	readonly key: string;
	/** Pass to `DocumentSidebarSection`, so the section remembers whether it's open. */
	readonly preferenceKey: `slot.${string}`;
	readonly options: TOptions;
};
