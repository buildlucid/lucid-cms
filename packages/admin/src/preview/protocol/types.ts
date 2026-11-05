import type { PreviewFieldTarget } from "@lucidcms/types";
import type { previewProtocol } from "./constants.js";

export type { PreviewFieldBrick, PreviewFieldTarget } from "@lucidcms/types";

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
	errors: PreviewFieldPath[];
	/** The admin's theme, whose green the page's selection and drop outlines use. */
	theme: "light" | "dark";
};

/** Where a field, item or brick is in the edited document: its brick, if any, and content path. */
export type PreviewFieldPath = Pick<PreviewFieldTarget, "brick" | "path">;

/** A repeater by its brick's key and its content path, with "*" for the items of repeaters it's inside. */
export type PreviewRepeater = {
	brick?: string;
	path: string[];
};

/** What a structural target is: a builder brick (empty path), a repeater item (path ending in its index) or a field. */
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
	target: PreviewFieldTarget;
	rect: PreviewRect;
};

/** A brick or repeater item on the page, with its neighbours there to move it next to. */
export type PreviewHoverBlock = PreviewHoverElement & {
	previous: PreviewFieldTarget | null;
	next: PreviewFieldTarget | null;
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

export type PreviewEnvelope = {
	scope: typeof previewProtocol.scope;
	version: typeof previewProtocol.version;
};

/** Announces the preview runtime, again whenever `updates` changes. */
export type PreviewReadyMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.ready;
	/** Whether the page re-renders itself on updates. Without it the builder reloads the frame. */
	updates: boolean;
	/** When the page started loading, in milliseconds since the epoch, which says what content it can show. */
	loadedAt: number;
};

/** Says the page shows a revision, once its update handlers finished with it. */
export type PreviewRenderedMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.rendered;
	revision: number;
};

/** Says the user cleared the page's selection. */
export type PreviewDeselectMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.deselect;
};

/** Says the page is going away, so updates wait for the next page to announce itself. */
export type PreviewUnloadMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.unload;
};

export type PreviewConnectMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.connect;
};

export type PreviewCaptureScrollMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.captureScroll;
	requestId: string;
};

export type PreviewScrollStateMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.scrollState;
	requestId: string;
	state: PreviewScrollState;
};

export type PreviewRestoreScrollMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.restoreScroll;
	state: PreviewScrollState;
};

/** Asks the builder to open a field, or a brick when the target's path is empty. */
export type PreviewFocusFieldMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.focusField;
	target: PreviewFieldTarget;
};

/** Says the previewed content changed, either unsaved edits or a save. Revisions only increase within one preview. */
export type PreviewUpdateMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.update;
	revision: number;
};

/** Turns on edit mode for one document, or turns it off with null. */
export type PreviewEditModeMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.editMode;
	editing: PreviewEditing | null;
};

/** Points out where a field or brick focused in the builder is on the page. */
export type PreviewHighlightFieldMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.highlightField;
	target: PreviewFieldTarget;
};

/** Asks the builder to move a brick or repeater item next to a sibling `anchor`, after a drag or keyboard move. */
export type PreviewMoveMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.move;
	target: PreviewFieldTarget;
	place: PreviewPlace;
	anchor: PreviewFieldTarget;
};

/** Reports what the pointer is over and where it is, again whenever either changes. */
export type PreviewHoverMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.hover;
	hover: PreviewHover;
};

/** Moves a brick or item being dragged by the builder's handle to a point in the page's viewport. */
export type PreviewDragMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.drag;
	target: PreviewFieldTarget;
	x: number;
	y: number;
};

/** Ends a drag, moving what was dragged to where it was shown landing when `drop` is true. */
export type PreviewDragEndMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.dragEnd;
	drop: boolean;
};

/** Says a link was clicked on the page, which the builder's preview doesn't follow. */
export type PreviewNavigationLockedMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.navigationLocked;
};

/**
 * Requests editing on a second click or Enter. `text` contains the element's text-only value for
 * inline editing checks, otherwise null.
 */
export type PreviewEditMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.edit;
	target: PreviewFieldTarget;
	text: string | null;
};

/** Where a dragged brick or item would be moved to: next to a sibling. */
export type PreviewLanding = {
	anchor: PreviewFieldTarget;
	place: PreviewPlace;
};

/** Fields-column drag target and proposed landing position. */
export type PreviewDragged = {
	target: PreviewFieldTarget;
	/** Null while it's over where it already is. */
	landing: PreviewLanding | null;
};

/** Reports a fields-column drag and landing position, or null after drop. */
export type PreviewDraggedMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.dragged;
	target: PreviewFieldTarget | null;
	/** Null while it's over where it already is. */
	landing: PreviewLanding | null;
};

/** Says the builder is zooming the page out or back in, while which the page keeps what's dragged or selected where it's drawn. */
export type PreviewZoomMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.zoom;
	zooming: boolean;
};

/** Asks the page to edit its selected field, as clicking it again would. */
export type PreviewEditSelectedMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.editSelected;
	target: PreviewFieldTarget;
};

/** Starts typing a field's text where the page shows it. */
export type PreviewInlineStartMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.inlineStart;
	target: PreviewFieldTarget;
	/** Whether Enter starts a new line rather than finishing. */
	multiline: boolean;
	/** Whether the element shows a placeholder for an empty field, which is cleared to type into. */
	clear: boolean;
};

/** The text typed into a field on the page so far. */
export type PreviewInlineInputMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.inlineInput;
	target: PreviewFieldTarget;
	value: string;
};

/** Finishes typing on the page, keeping what was typed, or going back to what was there when `cancelled`. */
export type PreviewInlineEndMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.inlineEnd;
	target: PreviewFieldTarget;
	cancelled: boolean;
};

export type PreviewChildMessage =
	| PreviewReadyMessage
	| PreviewUnloadMessage
	| PreviewRenderedMessage
	| PreviewScrollStateMessage
	| PreviewFocusFieldMessage
	| PreviewDeselectMessage
	| PreviewMoveMessage
	| PreviewHoverMessage
	| PreviewNavigationLockedMessage
	| PreviewEditMessage
	| PreviewInlineInputMessage
	| PreviewInlineEndMessage;

export type PreviewParentMessage =
	| PreviewConnectMessage
	| PreviewCaptureScrollMessage
	| PreviewRestoreScrollMessage
	| PreviewUpdateMessage
	| PreviewEditModeMessage
	| PreviewHighlightFieldMessage
	| PreviewDragMessage
	| PreviewDragEndMessage
	| PreviewEditSelectedMessage
	| PreviewInlineStartMessage
	| PreviewZoomMessage
	| PreviewDraggedMessage;

/** Each message in a union without its envelope. */
type WithoutEnvelope<TMessage> = TMessage extends PreviewEnvelope
	? Omit<TMessage, keyof PreviewEnvelope>
	: never;

/** Any message without its envelope, as passed to `createPreviewMessage`. */
export type PreviewMessagePayload = WithoutEnvelope<
	PreviewChildMessage | PreviewParentMessage
>;
