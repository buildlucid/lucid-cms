import type { PreviewTarget } from "@lucidcms/types";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { PreviewPlace } from "../../preview/protocol/types.js";
import type {
	documentPreviewSlotPolicies,
	previewToolbarItems,
} from "./constants.js";

export type DocumentPreviewSlot = keyof typeof documentPreviewSlotPolicies;

export type PreviewToolbarItemKey = (typeof previewToolbarItems)[number];

/** Where a plugin item sits, next to one of the toolbar's built-in items. */
export type PreviewToolbarPosition =
	| { before: PreviewToolbarItemKey }
	| { after: PreviewToolbarItemKey };

export type DocumentPreviewSlotPlacement =
	| {
			/**
			 * Replaces the preview page beneath its toolbar. Use `PreviewFrame` for the live page,
			 * `useDocumentPreview()` for preview state and `useDocumentEditor()` for document edits.
			 */
			slot: "document.preview";
			match?: { collection?: string };
	  }
	| {
			/** Adds an item to the preview toolbar. Read the preview with `useDocumentPreview()`. */
			slot: "document.previewToolbar";
			match?: { collection?: string };
			/** Falls back to the end of the toolbar, as it does when the item it's next to isn't shown. */
			position?: PreviewToolbarPosition;
	  };

export type DocumentPreviewSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: "document.preview";
	readonly key: string;
	readonly options: TOptions;
};

export type PreviewToolbarSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: "document.previewToolbar";
	readonly key: string;
	readonly options: TOptions;
};

/** Where the live page is: making a session, showing the page, or why it can't, eg. a new document that isn't saved yet. */
export type PreviewPageState =
	| "idle"
	| "loading"
	| "ready"
	| "unsaved"
	| "unavailable"
	| "error";

/** The live page a `PreviewFrame` shows. */
export type PreviewPage = {
	readonly state: PreviewPageState;
	/** The address the frame loads, or undefined while there's none. */
	readonly url: string | undefined;
	/** Rises each time the page loads or shows new content, so what's read from it can be read again. */
	readonly revision: number;
	/** Loads a new session, keeping the scroll position. */
	refresh: () => void;
	/** Opens the saved content's preview in a new tab, which unsaved edits don't reach. */
	openInTab: () => void;
	/**
	 * Current page markup, or null if unavailable or missing Lucid's preview script. Parse with
	 * `DOMParser` to avoid executing scripts.
	 */
	html: () => Promise<string | null>;
};

/** The open document's preview, as `useDocumentPreview` returns it. */
export type DocumentPreviewHandle = {
	/** Whether edit mode is on, in which the page's fields, bricks and items can be picked and moved. */
	readonly editMode: boolean;
	setEditMode: (editMode: boolean) => void;
	/** Whether fields can be edited from the preview. Locale-limited proposals only edit their own locales. */
	readonly canEdit: boolean;
	/** Whether bricks and repeater items can be added, moved and removed. */
	readonly canChangeStructure: boolean;
	/** Opens a brick, repeater item or field in the builder's fields. */
	focus: (target: PreviewTarget) => void;
	/**
	 * Changes bricks and repeater items as the page's own controls do, under the same locks and
	 * permissions. Each returns whether it changed anything.
	 */
	structure: {
		/** Adds a brick of `brickKey` next to a brick, an item next to an item, or an item at either end of a repeater targeted as a field. */
		add: (
			target: PreviewTarget,
			place: PreviewPlace,
			brickKey?: string,
		) => boolean;
		/** Moves a brick or item next to a sibling `anchor`. */
		move: (
			target: PreviewTarget,
			place: PreviewPlace,
			anchor: PreviewTarget,
		) => boolean;
		remove: (target: PreviewTarget) => boolean;
	};
	/** The live page, while a `PreviewFrame` shows one. */
	readonly page: PreviewPage | undefined;
};
