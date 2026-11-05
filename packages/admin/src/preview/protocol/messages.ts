import { previewProtocol, previewProtocolLimits } from "./constants.js";
import type {
	PreviewBuilderMessages,
	PreviewEnvelope,
	PreviewLanding,
	PreviewMessage,
	PreviewMessageHandlers,
	PreviewMessagePayload,
	PreviewPageMessages,
	PreviewTarget,
} from "./types.js";
import {
	hasOnlyKeys,
	isBoundedString,
	isFiniteNumber,
	isRecord,
} from "./utils/validation.js";
import {
	arePreviewSiblings,
	getPreviewTargetKind,
	isPreviewEditing,
	isPreviewFieldTarget,
	isPreviewHover,
	isPreviewPlace,
	isPreviewScrollState,
	isPreviewTarget,
	isPreviewText,
} from "./validators.js";

type Untrusted = Record<string, unknown>;
type MessageChecks<TMessages> = {
	[Type in keyof TMessages]: (message: Untrusted) => boolean;
};

const envelopeKeys = ["scope", "version", "type"] as const;

/** Whether a message holds only its envelope and these keys. */
const hasKeys = (message: Untrusted, ...keys: string[]) =>
	hasOnlyKeys(message, [...envelopeKeys, ...keys]);

const isRequestId = (value: unknown): value is string =>
	isBoundedString(value, previewProtocolLimits.requestIdLength);

/** A web address on the previewed site, within the protocol's limit. */
const isPreviewHref = (value: unknown): value is string => {
	if (!isBoundedString(value, previewProtocolLimits.pageKeyLength)) {
		return false;
	}
	try {
		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
};

/** Revisions only rise within one preview, from zero. */
const isRevision = (value: unknown): value is number =>
	typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/** Bricks and repeater items can be dragged and moved; fields can't. */
const isMovableTarget = (value: unknown): value is PreviewTarget =>
	isPreviewTarget(value) && getPreviewTargetKind(value) !== "field";

const isPreviewLanding = (
	target: PreviewTarget,
	value: unknown,
): value is PreviewLanding =>
	isRecord(value) &&
	hasOnlyKeys(value, ["anchor", "place"]) &&
	isPreviewTarget(value.anchor) &&
	arePreviewSiblings(target, value.anchor) &&
	isPreviewPlace(value.place);

const pageMessageChecks = {
	ready: (message) =>
		hasKeys(message, "updates", "loadedAt") &&
		typeof message.updates === "boolean" &&
		isFiniteNumber(message.loadedAt),
	unload: (message) => hasKeys(message),
	scrollState: (message) =>
		hasKeys(message, "requestId", "state") &&
		isRequestId(message.requestId) &&
		isPreviewScrollState(message.state),
	focus: (message) =>
		hasKeys(message, "target") && isPreviewTarget(message.target),
	deselect: (message) => hasKeys(message),
	move: (message) =>
		hasKeys(message, "target", "place", "anchor") &&
		isPreviewTarget(message.target) &&
		isPreviewPlace(message.place) &&
		isPreviewTarget(message.anchor) &&
		arePreviewSiblings(message.target, message.anchor),
	hover: (message) =>
		hasKeys(message, "hover") && isPreviewHover(message.hover),
	navigationLocked: (message) =>
		hasKeys(message, "href") &&
		(message.href === null || isPreviewHref(message.href)),
	edit: (message) =>
		hasKeys(message, "target", "text") &&
		isPreviewFieldTarget(message.target) &&
		(message.text === null || isPreviewText(message.text)),
	inlineInput: (message) =>
		hasKeys(message, "target", "value") &&
		isPreviewFieldTarget(message.target) &&
		isPreviewText(message.value),
	inlineEnd: (message) =>
		hasKeys(message, "target", "cancelled") &&
		isPreviewFieldTarget(message.target) &&
		typeof message.cancelled === "boolean",
} satisfies MessageChecks<PreviewPageMessages>;

const builderMessageChecks = {
	connect: (message) => hasKeys(message),
	captureScroll: (message) =>
		hasKeys(message, "requestId") && isRequestId(message.requestId),
	restoreScroll: (message) =>
		hasKeys(message, "state") && isPreviewScrollState(message.state),
	update: (message) =>
		hasKeys(message, "revision") && isRevision(message.revision),
	editMode: (message) =>
		hasKeys(message, "editing") &&
		(message.editing === null || isPreviewEditing(message.editing)),
	highlight: (message) =>
		hasKeys(message, "target") && isPreviewTarget(message.target),
	drag: (message) =>
		hasKeys(message, "target", "x", "y") &&
		isMovableTarget(message.target) &&
		isFiniteNumber(message.x) &&
		isFiniteNumber(message.y),
	dragEnd: (message) =>
		hasKeys(message, "drop") && typeof message.drop === "boolean",
	dragged: (message) =>
		hasKeys(message, "target", "landing") &&
		(message.target === null
			? message.landing === null
			: isMovableTarget(message.target) &&
				(message.landing === null ||
					isPreviewLanding(message.target, message.landing))),
	zoom: (message) =>
		hasKeys(message, "zooming") && typeof message.zooming === "boolean",
	editSelected: (message) =>
		hasKeys(message, "target") && isPreviewFieldTarget(message.target),
	inlineStart: (message) =>
		hasKeys(message, "target", "multiline", "clear") &&
		isPreviewFieldTarget(message.target) &&
		typeof message.multiline === "boolean" &&
		typeof message.clear === "boolean",
} satisfies MessageChecks<PreviewBuilderMessages>;

/** Builds a guard that accepts a message in the current protocol whose type and shape `checks` knows. */
const createMessageGuard =
	<TMessages>(checks: MessageChecks<TMessages>) =>
	(value: unknown): value is PreviewMessage<TMessages> => {
		if (
			!isRecord(value) ||
			value.scope !== previewProtocol.scope ||
			value.version !== previewProtocol.version ||
			typeof value.type !== "string" ||
			!Object.hasOwn(checks, value.type)
		) {
			return false;
		}
		return checks[value.type as keyof TMessages](value);
	};

/** Validates a message the page sent the builder. */
export const isPreviewPageMessage =
	createMessageGuard<PreviewPageMessages>(pageMessageChecks);

/** Validates a message the builder sent the page. */
export const isPreviewBuilderMessage =
	createMessageGuard<PreviewBuilderMessages>(builderMessageChecks);

/** Adds the current protocol envelope to a message. */
export const createPreviewMessage = <
	TPayload extends
		| PreviewMessagePayload<PreviewPageMessages>
		| PreviewMessagePayload<PreviewBuilderMessages>,
>(
	payload: TPayload,
): PreviewEnvelope & TPayload => ({
	scope: previewProtocol.scope,
	version: previewProtocol.version,
	...payload,
});

/** Runs the handler for a validated message's type. */
export const handlePreviewMessage = <TMessages>(
	message: PreviewMessage<NoInfer<TMessages>>,
	handlers: PreviewMessageHandlers<TMessages>,
) => {
	const handler = handlers[message.type] as (
		message: PreviewMessage<TMessages>,
	) => void;
	handler(message);
};
