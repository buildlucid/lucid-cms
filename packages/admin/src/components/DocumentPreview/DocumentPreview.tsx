import type {
	CollectionPreviewBreakpoint,
	DocumentVersionType,
	InternalCollectionDocument,
	PreviewMode,
} from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	Show,
} from "solid-js";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import type { UsePreviewAgent } from "@/hooks/usePreviewAgent/usePreviewAgent";
import type { UsePreviewFieldEdit } from "@/hooks/usePreviewFieldEdit/usePreviewFieldEdit";
import type {
	PreviewRepeaterCapacity,
	PreviewStructureChange,
} from "@/hooks/usePreviewStructure/usePreviewStructure";
import {
	builderPreviewContext,
	getPreviewTargetKind,
	type PreviewEditing,
	type PreviewFieldPath,
	type PreviewFieldTarget,
	type PreviewHover,
	type PreviewDragged,
	type PreviewScrollState,
	previewQueryParams,
} from "@/preview/protocol";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";
import brickHelpers from "@/utils/brick-helpers";
import {
	getPreviewRepeaters,
	type PreviewEditingDetails,
} from "@/utils/preview-editing";
import spawnToast from "@/utils/spawn-toast";
import {
	PreviewCanvas,
	type PreviewWidthSelection,
	type PreviewZoom,
	type ResolverState,
} from "./parts/PreviewCanvas";
import { PreviewOverlay } from "./parts/PreviewOverlay";
import { createPreviewBridge } from "./utils/preview-bridge";

const DRAFT_DEBOUNCE_MS = 250;
//* the first edit after a pause shows at once, the rest wait for editing to pause
const DRAFT_IDLE_MS = 1000;
//* sessions this close to expiring, or past half their lifetime when that's shorter, are replaced rather than updated
const SESSION_RENEW_MS = 5 * 60 * 1000;
//* keeps a clock ahead of the server's from replacing the session on every edit
const SESSION_MIN_MS = 60 * 1000;

/** The preview the frame shows, which the editor's unsaved content is written to. */
type PreviewSession = {
	url: string;
	token: string;
	/** When the session is replaced rather than updated, ahead of its expiry. */
	renewAt: number;
	/** Rises with every draft write and refresh. */
	revision: number;
	/** Whether the server may hold unsaved content for this session. */
	hasDraft: boolean;
	/** The editor's content as last written to this session, or null before a write succeeds. */
	syncedStamp: string | null;
};

export const DocumentPreview: Component<{
	open: Accessor<boolean>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	versionType: Accessor<DocumentVersionType>;
	versionId: Accessor<number | undefined>;
	mode: Accessor<PreviewMode>;
	locale: Accessor<string | undefined>;
	breakpoints: Accessor<CollectionPreviewBreakpoint[]>;
	dirty: Accessor<boolean>;
	saveStamp: Accessor<string>;
	/** The version being edited, which unsaved content is previewed against. */
	draftVersionId: Accessor<number | undefined>;
	/** Whether unsaved content can be previewed, matching who can save it. */
	canSyncDraft: Accessor<boolean>;
	/** The saved route, which the preview URL is built from. */
	route: Accessor<InternalCollectionDocument["route"] | undefined>;
	/** Whether the document can be changed from the page: fields edited, and bricks and repeater items added, moved and removed. */
	canEdit: Accessor<boolean>;
	/** The brick and field names edit mode's controls show. */
	editingDetails: Accessor<PreviewEditingDetails | null>;
	/** The fields with validation errors, which edit mode outlines in red. */
	errors: Accessor<PreviewFieldPath[]>;
	/** The field or brick last focused in the builder, which the page points out. */
	builderTarget: Accessor<PreviewFieldTarget | null>;
	/** Opens a field, item or brick in the builder; `activate` also opens a field's picker, or puts the cursor in it. */
	onFocusField: (
		target: PreviewFieldTarget,
		options?: { activate?: boolean },
	) => void;
	/** Applies a change to bricks or repeater items made from the page, returning its undo step, or null when it made none. */
	onChange: (
		target: PreviewFieldTarget,
		change: PreviewStructureChange,
	) => number | null;
	/** Undoes a change's step, when nothing has changed since. */
	onUndo: (step: number) => void;
	/** How many items a repeater, or an item's repeater, has and can have. */
	repeaterCapacity: (
		target: PreviewFieldTarget,
	) => PreviewRepeaterCapacity | null;
	/** Edits text fields picked on the page where it shows them. */
	fieldEdit: UsePreviewFieldEdit;
	/** Adds bricks, items and fields picked on the page to the agent chat. */
	agent: UsePreviewAgent;
	registerScrollCapture?: (
		capture: () => Promise<PreviewScrollState | null>,
	) => () => void;
	consumeScrollRestore?: () => PreviewScrollState | null;
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	const brickStore = useBrickStore();
	let resolveSequence = 0;
	//* a highlight the builder asked for, waiting for the page to catch up
	let pendingHighlight: PreviewFieldTarget | null = null;
	let session: PreviewSession | null = null;
	let syncTimer: number | undefined;
	let lastChangeAt = 0;
	let syncing = false;
	let syncQueued = false;
	let refreshQueued = false;
	const [url, setUrl] = createSignal<string | null>(null);
	const [resolverState, setResolverState] = createSignal<ResolverState>("idle");
	const [frameLoading, setFrameLoading] = createSignal(false);
	const [selectedWidth, setSelectedWidth] =
		createSignal<PreviewWidthSelection>("fit");
	const [customWidth, setCustomWidth] = createSignal(768);
	const [zoom, setZoom] = createSignal<PreviewZoom>("fit");
	const [hover, setHover] = createSignal<PreviewHover | null>(null);
	//* whether a field is being typed into on the page
	const [typing, setTyping] = createSignal(false);
	//* a brick dragged on the page, while which the page zooms out
	const [pageDrag, setPageDrag] = createSignal(false);
	const previewBridge = createPreviewBridge({
		onFocusField: (target) => focusField(target),
		onMove: (target, place, anchor) => {
			change(target, { action: "move", place, anchor });
		},
		onHover: setHover,
		onRendered: () => {
			if (pendingHighlight) highlight(pendingHighlight);
		},
		onDeselect: () => {
			pendingHighlight = null;
		},
		onReload: () => setFrameLoading(true),
		onNavigationLocked: () =>
			spawnToast({
				title: T()("preview.navigation.locked.title"),
				message: T()("preview.navigation.locked.message"),
			}),
		onEdit: (target, text) => editField(target, text),
		onInlineInput: props.fieldEdit.input,
		onInlineEnd: (target, cancelled) => {
			setTyping(false);
			props.fieldEdit.end(target, cancelled);
		},
	});
	const unregisterScrollCapture = props.registerScrollCapture?.(
		previewBridge.captureScroll,
	);
	let initialScrollRestore = props.consumeScrollRestore?.() ?? null;

	// -------------------------------
	// Queries & Mutations
	const createPreview = api.documents.useCreatePreview();

	// ----------------------------------
	// Memos
	const frameSrc = createMemo(() => url() ?? undefined);
	const routeKey = createMemo(() =>
		JSON.stringify(props.route()?.path ?? null),
	);
	const editMode = createMemo(
		() =>
			userPreferencesStore.getCollectionPreviewEditing(props.collectionKey()) ??
			true,
	);
	//* a builder brick dragged in the fields column and where it would land, which the page shows it moving to while it zooms out
	const columnDrag = createMemo(
		(): PreviewDragged | null => {
			const drag = brickStore.get.brickDrag;
			const documentId = props.documentId();
			if (!drag || documentId === undefined) return null;
			const ordered = brickStore.get.bricks
				.filter((brick) => brick.type === "builder")
				.sort((a, b) => a.order - b.order);
			const from = ordered.findIndex((brick) => brick.ref === drag.ref);
			const to = ordered.findIndex((brick) => brick.ref === drag.over);
			const targetAt = (index: number): PreviewFieldTarget | null => {
				const brick = ordered[index];
				return brick
					? {
							collectionKey: props.collectionKey(),
							documentId,
							brick: { type: "builder", key: brick.key, ref: brick.ref },
							path: [],
						}
					: null;
			};
			const target = targetAt(from);
			const anchor = to === from ? null : targetAt(to);
			if (!target) return null;
			return {
				target,
				//* dropped on a brick, it takes that brick's place, so it goes after those below it and before those above
				landing: anchor
					? { anchor, place: to > from ? "after" : "before" }
					: null,
			};
		},
		null,
		{ equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
	);
	const zoomedOut = () => pageDrag() || columnDrag() !== null;
	const editing = createMemo((): PreviewEditing | null => {
		const documentId = props.documentId();
		const details = props.editingDetails();
		if (!editMode() || documentId === undefined || !details) return null;
		return {
			collectionKey: props.collectionKey(),
			documentId,
			editable: props.canEdit(),
			repeaters: getPreviewRepeaters(details),
			errors: props.errors(),
		};
	});

	// ----------------------------------
	// Functions
	const createPersistedPreview = async (
		context: "builder" | "standalone" = "standalone",
	) => {
		const documentId = props.documentId();
		if (documentId === undefined) return null;

		const response = await createPreview.action.mutateAsync({
			collectionKey: props.collectionKey(),
			documentId,
			versionType: props.versionType(),
			versionId: props.versionId(),
			mode: props.mode(),
			locale: props.locale(),
		});
		const { url: previewUrl, expiresAt } = response.data;
		if (!previewUrl) return null;
		if (context !== "builder") return { url: previewUrl, expiresAt };

		const url = new URL(previewUrl);
		url.searchParams.set(previewQueryParams.context, builderPreviewContext);
		return { url: url.toString(), expiresAt };
	};
	/** Changes whenever the editor's content or saved snapshot does. */
	const editStamp = () =>
		`${brickStore.get.contentRevision}:${brickStore.get.snapshotRevision}`;
	/** Writes the editor's unsaved content to a session, or clears it once saved. Returns whether what the preview shows changed. */
	const writeDraft = async (target: PreviewSession) => {
		const documentId = props.documentId();
		const versionId = props.draftVersionId();
		if (documentId === undefined || versionId === undefined) return false;
		const stamp = editStamp();
		const mutated = brickStore.getDocumentContentMutated();

		const draft =
			props.canSyncDraft() && mutated
				? {
						bricks: brickHelpers.getUpsertBricks(),
						fields: brickHelpers.getCollectionPseudoBrickFields(),
					}
				: null;
		if (draft === null && !target.hasDraft) {
			//* the page shows saved content, which only matches the editor's without unsaved edits
			if (!mutated) target.syncedStamp = stamp;
			return false;
		}

		target.revision += 1;
		//* a write whose response is lost may still have landed, so it's cleared later either way
		if (draft !== null) target.hasDraft = true;
		try {
			await api.documents.updatePreviewDraftReq({
				collectionKey: props.collectionKey(),
				documentId,
				versionId,
				token: target.token,
				revision: target.revision,
				draft,
			});
			target.hasDraft = draft !== null;
			target.syncedStamp = stamp;
			return true;
		} catch {
			return false;
		}
	};
	/** Writes the latest content to the session and shows it, one sync at a time. */
	const sync = async () => {
		const target = session;
		if (!target) return;
		if (syncing) {
			syncQueued = true;
			return;
		}

		syncing = true;
		const refresh = refreshQueued;
		refreshQueued = false;
		try {
			if (Date.now() >= target.renewAt) {
				await resolvePersistedPreview(true);
				return;
			}

			const changed = await writeDraft(target);
			if (!changed && !refresh) return;
			if (!changed) target.revision += 1;
			if (target === session) previewBridge.show(target.revision);
		} finally {
			syncing = false;
			if (syncQueued) {
				syncQueued = false;
				void sync();
			}
		}
	};
	/** Queues a sync, straight away after a pause in editing. `refresh` shows the content even when no draft changed, eg. after a save. */
	const scheduleSync = (refresh = false) => {
		if (refresh) refreshQueued = true;
		const now = performance.now();
		const idle = now - lastChangeAt > DRAFT_IDLE_MS;
		lastChangeAt = now;
		window.clearTimeout(syncTimer);
		syncTimer = window.setTimeout(
			() => void sync(),
			idle ? 0 : DRAFT_DEBOUNCE_MS,
		);
	};
	const resolvePersistedPreview = async (preserveScroll = false) => {
		const currentResolve = ++resolveSequence;
		const handedOffScroll = initialScrollRestore;
		initialScrollRestore = null;
		if (!preserveScroll && !handedOffScroll) {
			previewBridge.queueScrollRestore(null);
		}
		try {
			const scrollState =
				handedOffScroll ??
				(preserveScroll ? await previewBridge.captureScroll() : null);
			if (currentResolve !== resolveSequence) return;

			setResolverState("loading");
			const persisted = await createPersistedPreview("builder");
			if (currentResolve !== resolveSequence) return;
			const token = persisted
				? new URL(persisted.url).searchParams.get(previewQueryParams.token)
				: null;
			if (!persisted || !token) {
				session = null;
				previewBridge.queueScrollRestore(null);
				setUrl(null);
				setFrameLoading(false);
				setResolverState("unavailable");
				return;
			}

			const lifetime = persisted.expiresAt
				? Date.parse(persisted.expiresAt) - Date.now()
				: Number.POSITIVE_INFINITY;
			const nextSession: PreviewSession = {
				url: persisted.url,
				token,
				renewAt:
					Date.now() +
					Math.max(
						SESSION_MIN_MS,
						lifetime - Math.min(SESSION_RENEW_MS, lifetime / 2),
					),
				revision: 0,
				hasDraft: false,
				syncedStamp: null,
			};
			//* unsaved content is written first so the page's first render shows it
			const writtenAt = editStamp();
			await writeDraft(nextSession);
			if (currentResolve !== resolveSequence) return;

			session = nextSession;
			previewBridge.expectLoad(nextSession.revision);
			//* edits made while the first draft was written had no session to go to
			if (editStamp() !== writtenAt) scheduleSync();
			setFrameLoading(true);
			previewBridge.queueScrollRestore(scrollState, persisted.url);
			setUrl(persisted.url);
			setResolverState("ready");
		} catch {
			if (currentResolve !== resolveSequence) return;
			session = null;
			previewBridge.queueScrollRestore(null);
			setFrameLoading(false);
			setResolverState("error");
		}
	};
	/**
	 * Defers targets until the page catches up with edits. Repeater positions may be stale; brick refs
	 * remain stable.
	 */
	const isBehind = (targets: PreviewFieldTarget[]) =>
		props.canSyncDraft() &&
		targets.some((target) =>
			target.path.some((segment) => typeof segment === "number"),
		) &&
		!(
			session !== null &&
			session.syncedStamp === editStamp() &&
			previewBridge.isShowing(session.revision)
		);
	/** Refuses targets that have to wait for the page, saying why. */
	const waitsForPage = (targets: PreviewFieldTarget[]) => {
		if (!isBehind(targets)) return false;
		spawnToast({
			title: T()("preview.behind.title"),
			message: T()("preview.behind.message"),
			status: "warning",
		});
		return true;
	};
	/** Points a target out on the page, once the page shows where it is. */
	const highlight = (target: PreviewFieldTarget) => {
		pendingHighlight = isBehind([target]) ? target : null;
		if (!pendingHighlight) previewBridge.highlight(target);
	};
	/** Opens a field in the builder, returning whether it did. */
	const focusField = (target: PreviewFieldTarget) => {
		if (waitsForPage([target])) return false;
		props.onFocusField(target);
		return true;
	};
	/** Edits a field the page asked to: typed into there, or opened in the builder's fields with its picker or cursor. */
	const editField = (target: PreviewFieldTarget, text: string | null) => {
		if (waitsForPage([target])) return;
		const edit = props.fieldEdit.request(target, text);
		switch (edit.mode) {
			case "inline": {
				const started = previewBridge.startInline(target, {
					multiline: edit.multiline,
					clear: edit.clear,
				});
				if (started) setTyping(true);
				else props.fieldEdit.end(target, true);
				return;
			}
			case "builder":
				props.onFocusField(target, { activate: true });
				return;
			case "none":
				return;
		}
	};
	const change = (target: PreviewFieldTarget, next: PreviewStructureChange) =>
		waitsForPage(next.action === "move" ? [target, next.anchor] : [target])
			? null
			: props.onChange(target, next);
	const warnWhenDirty = () => {
		if (!props.dirty()) return;
		spawnToast({
			title: T()("preview.saved.url.title"),
			message: T()("preview.saved.url.message"),
			status: "warning",
		});
	};
	const copyPersistedUrl = async () => {
		try {
			warnWhenDirty();
			const persisted = await createPersistedPreview();
			if (!persisted) {
				spawnToast({
					title: T()("preview.unavailable.title"),
					message: T()("preview.unavailable.message"),
					status: "warning",
				});
				return;
			}
			await navigator.clipboard.writeText(persisted.url);
			spawnToast({
				title: T()("toasts.common.copy.to.clipboard.title"),
				status: "success",
			});
		} catch {
			return;
		}
	};
	const openPersistedUrl = async () => {
		const previewWindow = window.open("about:blank", "_blank");
		if (previewWindow) previewWindow.opener = null;
		warnWhenDirty();
		try {
			const persisted = await createPersistedPreview();
			if (!persisted) {
				previewWindow?.close();
				spawnToast({
					title: T()("preview.unavailable.title"),
					message: T()("preview.unavailable.message"),
					status: "warning",
				});
				return;
			}
			if (previewWindow) {
				previewWindow.location.replace(persisted.url);
				return;
			}
			window.open(persisted.url, "_blank", "noopener,noreferrer");
		} catch {
			previewWindow?.close();
		}
	};

	// ----------------------------------
	// Effects
	createEffect(
		on(
			() =>
				[
					props.open(),
					props.collectionKey(),
					props.documentId(),
					props.versionType(),
					props.versionId(),
					props.mode(),
					props.locale(),
					routeKey(),
				] as const,
			([open, collectionKey, documentId], previous) => {
				if (!open) return;
				const sameDocument =
					previous?.[0] === true &&
					previous[1] === collectionKey &&
					previous[2] === documentId;
				void resolvePersistedPreview(sameDocument);
			},
		),
	);
	createEffect(
		on(
			editStamp,
			() => {
				if (props.open()) scheduleSync();
			},
			{ defer: true },
		),
	);
	createEffect(
		on(props.saveStamp, (next, previous) => {
			if (previous === undefined || next === previous || !props.open()) return;
			scheduleSync(true);
		}),
	);
	createEffect(() => previewBridge.setEditing(editing()));
	//* the page shows the brick as being moved, then points it out where it was dropped
	createEffect(
		on(
			columnDrag,
			(drag, previous) => {
				previewBridge.setDragged(drag);
				if (!drag && previous) highlight(previous.target);
			},
			{ defer: true },
		),
	);
	createEffect(
		on(
			props.builderTarget,
			(target) => {
				if (target) highlight(target);
			},
			{ defer: true },
		),
	);

	// ----------------------------------
	// Lifecycle
	onCleanup(() => {
		resolveSequence += 1;
		window.clearTimeout(syncTimer);
		session = null;
		unregisterScrollCapture?.();
		previewBridge.cleanup();
	});

	// ----------------------------------
	// Render
	return (
		<section class="h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-card">
			<PreviewCanvas
				frameSrc={frameSrc}
				resolverState={resolverState}
				frameLoading={frameLoading}
				setFrameLoading={setFrameLoading}
				setFrameRef={previewBridge.setFrame}
				breakpoints={props.breakpoints}
				selectedWidth={selectedWidth}
				setSelectedWidth={setSelectedWidth}
				customWidth={customWidth}
				setCustomWidth={setCustomWidth}
				zoom={zoom}
				setZoom={setZoom}
				previewMode={props.mode}
				zoomedOut={zoomedOut}
				onZoomingChange={previewBridge.setZooming}
				pagePointer={() => hover()?.pointer ?? null}
				editMode={editMode}
				onToggleEditMode={() =>
					userPreferencesStore.setCollectionPreviewEditing(
						props.collectionKey(),
						!editMode(),
					)
				}
				actionLoading={() => createPreview.action.isPending}
				onRefresh={() => void resolvePersistedPreview(true)}
				onCopy={() => void copyPersistedUrl()}
				onOpen={() => void openPersistedUrl()}
				onRetry={() => void resolvePersistedPreview()}
				overlay={(viewport) => (
					<Show when={editing()}>
						<PreviewOverlay
							hover={hover()}
							scale={viewport.scale()}
							width={viewport.width()}
							editable={props.canEdit()}
							details={props.editingDetails()}
							errors={props.errors()}
							capacity={props.repeaterCapacity}
							onOpen={(target) => {
								if (focusField(target)) highlight(target);
							}}
							onEditField={previewBridge.editSelected}
							onAsk={props.agent.available() ? props.agent.ask : undefined}
							typing={typing()}
							onChange={change}
							onUndo={props.onUndo}
							onDrag={(target, point) => {
								if (getPreviewTargetKind(target) === "brick") setPageDrag(true);
								previewBridge.drag(target, point);
							}}
							onDragEnd={(drop) => {
								setPageDrag(false);
								previewBridge.endDrag(drop);
							}}
						/>
					</Show>
				)}
			/>
		</section>
	);
};
