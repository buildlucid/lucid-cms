import type {
	Collection,
	DocumentVersionType,
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
	PreviewMode,
} from "@types";
import { type Accessor, createMemo, createSignal } from "solid-js";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { usePreviewAgent } from "@/hooks/usePreviewAgent/usePreviewAgent";
import { usePreviewFieldEdit } from "@/hooks/usePreviewFieldEdit/usePreviewFieldEdit";
import { usePreviewFocus } from "@/hooks/usePreviewFocus/usePreviewFocus";
import { usePreviewStructure } from "@/hooks/usePreviewStructure/usePreviewStructure";
import type { PreviewScrollState } from "@/preview/protocol";
import { getPreviewEditingDetails } from "@/utils/preview-editing";
import { getPreviewErrors } from "@/utils/preview-errors";

const savedAt = (value: string | null | undefined) =>
	Date.parse(value ?? "") || 0;

/**
 * Connects editor state, unsaved drafts and page interactions. Pass the result to
 * `DocumentPreview`.
 */
export const useBuilderPreview = (props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	document: Accessor<InternalCollectionDocument | undefined>;
	versionType: Accessor<DocumentVersionType>;
	versionId: Accessor<number | undefined>;
	autoSaveMetadata: Accessor<DocumentVersionUpdateResponse | null>;
	locale: Accessor<string | null>;
	locales: Accessor<string[]>;
	label: Accessor<string>;
	dirty: Accessor<boolean>;
	/** Whether the person could save the content, which is what lets the preview show it unsaved. */
	canSave: Accessor<boolean>;
	/** Whether the editor has loaded the document's content. */
	ready: Accessor<boolean>;
	/** The collections the person can read, whose documents the page can open. */
	collections: Accessor<Collection[]>;
}) => {
	// ----------------------------------
	// State & Hooks
	const brickStore = useBrickStore();
	//* the preview's scroll position, kept while another version of the document loads
	let captureScroll: (() => Promise<PreviewScrollState | null>) | undefined;
	let pendingScroll: PreviewScrollState | null = null;
	//* rises when the preview has to start again, eg. once its session was revoked
	const [restarts, setRestarts] = createSignal(0);
	const document = {
		collectionKey: props.collectionKey,
		documentId: props.documentId,
		versionType: props.versionType,
		versionId: props.versionId,
		/** The version being edited, which unsaved content is previewed against. */
		draftVersionId: () => props.document()?.versionId ?? undefined,
		/** The saved route, which the preview URL is built from. */
		route: () => props.document()?.route,
		breakpoints: () => props.collection()?.preview?.breakpoints ?? [],
		dirty: props.dirty,
	};
	const focus = usePreviewFocus({
		collection: props.collection,
		collectionKey: props.collectionKey,
		documentId: props.documentId,
		locales: props.locales,
		ready: props.ready,
		collections: props.collections,
	});
	const structure = usePreviewStructure({
		collection: props.collection,
		collectionKey: props.collectionKey,
		documentId: props.documentId,
		locales: props.locales,
		reveal: (target) => {
			void focus.requestTarget(target);
			focus.pointOut(target);
		},
	});
	const fieldEdit = usePreviewFieldEdit({
		collection: props.collection,
		collectionKey: props.collectionKey,
		documentId: props.documentId,
		locales: props.locales,
	});

	// ----------------------------------
	// Memos
	const mode = createMemo<PreviewMode>(() =>
		props.versionType() === "revision" ||
		props.versionType() === "snapshot" ||
		props.versionType() === "proposal"
			? "scoped"
			: "navigable",
	);
	const locale = createMemo(() => props.locale() ?? undefined);
	//* the latest save, so the autosave refetch doesn't refresh the preview twice
	const saveStamp = createMemo(() => {
		const saved = props.document();
		const autoSave = props.autoSaveMetadata();
		const latest =
			autoSave && savedAt(autoSave.updatedAt) >= savedAt(saved?.updatedAt)
				? autoSave
				: saved;
		return `${latest?.updatedAt ?? ""}:${latest?.contentId ?? ""}`;
	});
	const details = createMemo(() => {
		const collection = props.collection();
		return collection ? getPreviewEditingDetails(collection) : null;
	});
	const errors = createMemo(
		() => {
			const collection = props.collection();
			const { brickErrors, fieldsErrors } = brickStore.get;
			if (!collection || (!brickErrors.length && !fieldsErrors.length)) {
				return [];
			}
			return getPreviewErrors({
				collection,
				bricks: brickStore.get.bricks,
				brickErrors,
				fieldsErrors,
				locale: locale(),
			});
		},
		[],
		//* it reads the bricks, which change with every edit, so only new paths count as a change
		{ equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
	);
	const agent = usePreviewAgent({
		collection: props.collection,
		collectionKey: props.collectionKey,
		documentId: props.documentId,
		label: props.label,
		details,
	});

	return {
		document,
		restarts,
		/** Starts the preview again with a new session, eg. once the document's preview links were revoked. */
		restart: () => setRestarts((count) => count + 1),
		mode,
		locale,
		saveStamp,
		/** Whether unsaved content can be previewed, matching who can save it. */
		canSyncDraft: props.canSave,
		/** Whether the document can be changed from the page: fields edited, and bricks and repeater items added, moved and removed. */
		canEdit: () => props.canSave() && !brickStore.get.locked,
		/** The brick and field names edit mode's controls show. */
		details,
		/** The fields with validation errors, which edit mode outlines in red. */
		errors,
		focus,
		structure,
		fieldEdit,
		agent,
		/** Keeps the preview's scroll position while another version of the document loads. */
		scroll: {
			register: (capture: () => Promise<PreviewScrollState | null>) => {
				captureScroll = capture;
				return () => {
					if (captureScroll === capture) captureScroll = undefined;
				};
			},
			/** Remembers where the preview is scrolled to, before the version changes. */
			keep: async () => {
				pendingScroll = (await captureScroll?.()) ?? null;
			},
			/** The position remembered for the next preview to restore, once. */
			take: () => {
				const state = pendingScroll;
				pendingScroll = null;
				return state;
			},
			reset: () => {
				captureScroll = undefined;
				pendingScroll = null;
			},
		},
	};
};

export type BuilderPreview = ReturnType<typeof useBuilderPreview>;
