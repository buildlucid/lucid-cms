import type { PreviewTarget } from "@lucidcms/types";
import type { previewProtocol } from "./constants.js";

export type {
	PreviewItem,
	PreviewTarget,
	PreviewTargetBrick,
} from "@lucidcms/types";

export type PreviewScrollState = {
	pageKey: string;
	x: number;
	y: number;
};

/** The document the page can be edited for. Other documents' fields and bricks stay as they are. */
export type PreviewEditing = {
	collectionKey: string;
	documentId: number;
	/** Whether the document can be changed from the page: its fields edited, and its bricks and repeater items moved. */
	editable: boolean;
	/** The repeaters items can be added to, by brick key (none for the document's own fields) and content path. */
	repeaters: PreviewRepeater[];
	/** The fields with validation errors. Items, repeaters and bricks holding one show as invalid too. */
	errors: PreviewTargetPath[];
	/** The admin's theme, whose green the page's selection and drop outlines use. */
	theme: "light" | "dark";
};

/** A field key or repeater item in a content path. */
export type PreviewPathSegment = PreviewTarget["path"][number];

/** Where a field, item or brick is in the edited document: its brick, if any, and content path. */
export type PreviewTargetPath = Pick<PreviewTarget, "brick" | "path">;

/** A repeater by its brick's key and its content path, with "*" for the items of repeaters it's inside. */
export type PreviewRepeater = {
	brick?: string;
	path: string[];
};

/** What a target is: a builder brick (empty path), a repeater item (path ending in one) or a field. */
export type PreviewTargetKind = "brick" | "item" | "field";

export type PreviewPlace = "before" | "after";

/** A box in the page's viewport, in CSS pixels. */
export type PreviewRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/** A marked element on the page. `key` names the element itself, so it can be followed when a re-render keeps it but changes its target, eg. an item that moved. */
export type PreviewHoverElement = {
	key: number;
	target: PreviewTarget;
	rect: PreviewRect;
};

/** A brick or repeater item on the page, with its neighbours there to move it next to. */
export type PreviewHoverBlock = PreviewHoverElement & {
	previous: PreviewTarget | null;
	next: PreviewTarget | null;
	/** Whether it sits beside its neighbours, like cards in a row, rather than above them. */
	horizontal: boolean;
};

/** What the pointer is over on the page, and what's selected, for the builder to draw controls against. */
export type PreviewHover = {
	brick: PreviewHoverBlock | null;
	item: PreviewHoverBlock | null;
	/** A repeater that items can be added to. */
	repeater: PreviewHoverElement | null;
	/** The selected field, item or brick, which a field's bar is drawn above. */
	selected: PreviewHoverElement | null;
	/** Where the pointer is, or null once it has left the page. */
	pointer: { x: number; y: number } | null;
	/** The bottom of a bar fixed across the top of the page, such as a site header, which controls stay below. */
	inset: number;
	/** Whether the page is scrolling, while which controls drawn against it hide. */
	scrolling: boolean;
};

/** Where a dragged brick or item would be moved to: next to a sibling. */
export type PreviewLanding = {
	anchor: PreviewTarget;
	place: PreviewPlace;
};

/** A drag in the builder's fields, and where it would land. */
export type PreviewDragged = {
	target: PreviewTarget;
	/** Null while it's over where it already is. */
	landing: PreviewLanding | null;
};

type NoData = Record<never, never>;

/** Messages the page sends the builder, by type. */
export type PreviewPageMessages = {
	/** Announces the runtime, again whenever `updates` changes. */
	ready: {
		/** Whether the page re-renders itself on updates. Without it the builder reloads the frame. */
		updates: boolean;
		/** When the page started loading, in milliseconds since the epoch, which says what content it can show. */
		loadedAt: number;
	};
	/** Says the page is going away, so updates wait for the next page to announce itself. */
	unload: NoData;
	scrollState: { requestId: string; state: PreviewScrollState };
	/** Asks the builder to open a field, item or brick. */
	focus: { target: PreviewTarget };
	/** Says the user cleared the page's selection. */
	deselect: NoData;
	/** Asks the builder to move a brick or repeater item next to a sibling `anchor`, after a drag or keyboard move. */
	move: { target: PreviewTarget; place: PreviewPlace; anchor: PreviewTarget };
	/** Reports what the pointer is over and where it is, again whenever either changes. */
	hover: { hover: PreviewHover };
	/** Says a link was clicked, which the builder's preview doesn't follow, with where it goes when that's on the page's own site. */
	navigationLocked: { href: string | null };
	/** Asks to edit a selected field. `text` is what its element shows when that's all it holds, otherwise null. */
	edit: { target: PreviewTarget; text: string | null };
	/** The text typed into a field on the page so far. */
	inlineInput: { target: PreviewTarget; value: string };
	/** Finishes typing, keeping what was typed or going back to what was there when `cancelled`. */
	inlineEnd: { target: PreviewTarget; cancelled: boolean };
};

/** Messages the builder sends the page, by type. */
export type PreviewBuilderMessages = {
	connect: NoData;
	captureScroll: { requestId: string };
	restoreScroll: { state: PreviewScrollState };
	/** Says the previewed content changed, either unsaved edits or a save. Revisions only rise within one preview. */
	update: { revision: number };
	/** Turns on edit mode for one document, or turns it off with null. */
	editMode: { editing: PreviewEditing | null };
	/** Points out where a field, item or brick focused in the builder is on the page. */
	highlight: { target: PreviewTarget };
	/** Moves a brick or item dragged by the builder's handle to a point in the page's viewport. */
	drag: { target: PreviewTarget; x: number; y: number };
	/** Ends a drag, moving what was dragged to where it was shown landing when `drop` is true. */
	dragEnd: { drop: boolean };
	/** Shows a drag in the builder's fields on the page, or ends it with a null target. */
	dragged: { target: PreviewTarget | null; landing: PreviewLanding | null };
	/** Says the builder is zooming the page out or back in, while which the page keeps what's dragged or selected where it's drawn. */
	zoom: { zooming: boolean };
	/** Asks the page to edit its selected field, as clicking it again would. */
	editSelected: { target: PreviewTarget };
	/** Starts typing a field's text where the page shows it. */
	inlineStart: {
		target: PreviewTarget;
		/** Whether Enter starts a new line rather than finishing. */
		multiline: boolean;
		/** Whether the element shows a placeholder for an empty field, which is cleared to type into. */
		clear: boolean;
	};
};

export type PreviewEnvelope = {
	scope: typeof previewProtocol.scope;
	version: typeof previewProtocol.version;
};

/** Each message in a map as it's sent, with its envelope and type. */
export type PreviewMessage<TMessages> = {
	[Type in keyof TMessages]: PreviewEnvelope & { type: Type } & TMessages[Type];
}[keyof TMessages];

/** Each message in a map as it's written, before its envelope is added. */
export type PreviewMessagePayload<TMessages> = {
	[Type in keyof TMessages]: { type: Type } & TMessages[Type];
}[keyof TMessages];

/** A handler for every message in a map, so a message no side handles doesn't compile. */
export type PreviewMessageHandlers<TMessages> = {
	[Type in keyof TMessages]: (
		message: Extract<PreviewMessage<TMessages>, { type: Type }>,
	) => void;
};
