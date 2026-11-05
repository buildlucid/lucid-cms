import {
	builderPreviewContext,
	previewParams,
} from "@lucidcms/client/contract";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import type { ResolverState } from "@/components/DocumentPreview/parts/PreviewCanvas";
import type { PreviewBridge } from "@/components/DocumentPreview/utils/preview-bridge";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import type { BuilderPreview } from "@/hooks/useBuilderPreview/useBuilderPreview";
import api from "@/services/api";
import T from "@/translations";
import brickHelpers from "@/utils/brick-helpers";
import { LucidError } from "@/utils/error-handling";
import spawnToast from "@/utils/spawn-toast";

const DRAFT_DEBOUNCE_MS = 250;
//* the first edit after a pause shows at once, the rest wait for editing to pause
const DRAFT_IDLE_MS = 1000;
//* sessions this close to expiring, or past half their lifetime when that's shorter, are replaced rather than updated
const SESSION_RENEW_MS = 5 * 60 * 1000;
//* keeps a clock ahead of the server's from replacing the session on every edit
const SESSION_MIN_MS = 60 * 1000;

/** The preview the frame shows, which the editor's unsaved content is written to. */
type Session = {
	url: string;
	token: string;
	/** When the session is replaced rather than updated, ahead of its expiry. */
	renewAt: number;
	/** Rises with every draft write and refresh. */
	revision: number;
	/** Whether the server may hold unsaved content for this session. */
	hasDraft: boolean;
};

/**
 * The preview session the frame shows while it's open: made for the document's version and
 * locale, sent the editor's unsaved content as it changes, and replaced before it expires.
 */
export const usePreviewSession = (props: {
	preview: BuilderPreview;
	open: Accessor<boolean>;
	bridge: PreviewBridge;
}) => {
	// ----------------------------------
	// State & Hooks
	const brickStore = useBrickStore();
	const { document } = props.preview;
	let resolveSequence = 0;
	let session: Session | null = null;
	let syncTimer: number | undefined;
	let lastChangeAt = 0;
	let syncing = false;
	let syncQueued = false;
	let refreshQueued = false;
	let initialScrollRestore = props.preview.scroll.take();
	const [url, setUrl] = createSignal<string | null>(null);
	const [state, setState] = createSignal<ResolverState>("idle");
	const [frameLoading, setFrameLoading] = createSignal(false);

	// -------------------------------
	// Queries & Mutations
	const createPreview = api.documents.useCreatePreview();

	// ----------------------------------
	// Memos
	const routeKey = createMemo(() =>
		JSON.stringify(document.route()?.path ?? null),
	);

	// ----------------------------------
	// Functions
	const createPersistedPreview = async (
		context: "builder" | "standalone" = "standalone",
	) => {
		const documentId = document.documentId();
		if (documentId === undefined) return null;

		const response = await createPreview.action.mutateAsync({
			collectionKey: document.collectionKey(),
			documentId,
			versionType: document.versionType(),
			versionId: document.versionId(),
			mode: props.preview.mode(),
			locale: props.preview.locale(),
		});
		const { url: previewUrl, expiresAt } = response.data;
		if (!previewUrl) return null;
		if (context !== "builder") return { url: previewUrl, expiresAt };

		const builderUrl = new URL(previewUrl);
		builderUrl.searchParams.set(previewParams.context, builderPreviewContext);
		return { url: builderUrl.toString(), expiresAt };
	};
	/** Changes whenever the editor's content or saved snapshot does. */
	const editStamp = () =>
		`${brickStore.get.contentRevision}:${brickStore.get.snapshotRevision}`;
	/** Writes the editor's unsaved content to a session, or clears it once saved. Returns whether what the preview shows changed. */
	const writeDraft = async (target: Session) => {
		const documentId = document.documentId();
		const versionId = document.draftVersionId();
		if (documentId === undefined || versionId === undefined) return false;

		const draft =
			props.preview.canSyncDraft() && brickStore.getDocumentContentMutated()
				? {
						bricks: brickHelpers.getUpsertBricks(),
						fields: brickHelpers.getCollectionPseudoBrickFields(),
					}
				: null;
		if (draft === null && !target.hasDraft) return false;

		target.revision += 1;
		//* a write whose response is lost may still have landed, so it's cleared later either way
		if (draft !== null) target.hasDraft = true;
		try {
			await api.documents.updatePreviewDraftReq({
				collectionKey: document.collectionKey(),
				documentId,
				versionId,
				token: target.token,
				revision: target.revision,
				draft,
			});
			target.hasDraft = draft !== null;
			return true;
		} catch (error) {
			//* a session that's gone, eg. as its document's preview links were revoked, is replaced on the next sync
			if (error instanceof LucidError && error.errorRes.status === 401) {
				target.renewAt = 0;
			}
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
				await resolve(true);
				return;
			}

			const changed = await writeDraft(target);
			if (!changed && !refresh) return;
			if (!changed) target.revision += 1;
			if (target === session) props.bridge.show(target.revision);
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
	/** Makes a new session and loads it in the frame, keeping the scroll position when `preserveScroll`. */
	const resolve = async (preserveScroll = false) => {
		const current = ++resolveSequence;
		if (document.documentId() === undefined) {
			session = null;
			setUrl(null);
			setFrameLoading(false);
			setState("unsaved");
			return;
		}
		const handedOffScroll = initialScrollRestore;
		initialScrollRestore = null;
		if (!preserveScroll && !handedOffScroll) {
			props.bridge.queueScrollRestore(null);
		}
		try {
			const scrollState =
				handedOffScroll ??
				(preserveScroll ? await props.bridge.captureScroll() : null);
			if (current !== resolveSequence) return;

			setState("loading");
			const persisted = await createPersistedPreview("builder");
			if (current !== resolveSequence) return;
			const token = persisted
				? new URL(persisted.url).searchParams.get(previewParams.token)
				: null;
			if (!persisted || !token) {
				session = null;
				props.bridge.queueScrollRestore(null);
				setUrl(null);
				setFrameLoading(false);
				setState("unavailable");
				return;
			}

			const lifetime = persisted.expiresAt
				? Date.parse(persisted.expiresAt) - Date.now()
				: Number.POSITIVE_INFINITY;
			const next: Session = {
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
			};
			//* unsaved content is written first so the page's first render shows it
			const writtenAt = editStamp();
			await writeDraft(next);
			if (current !== resolveSequence) return;

			session = next;
			props.bridge.expectLoad(next.revision);
			//* edits made while the first draft was written had no session to go to
			if (editStamp() !== writtenAt) scheduleSync();
			setFrameLoading(true);
			props.bridge.queueScrollRestore(scrollState, persisted.url);
			setUrl(persisted.url);
			setState("ready");
		} catch {
			if (current !== resolveSequence) return;
			session = null;
			props.bridge.queueScrollRestore(null);
			setFrameLoading(false);
			setState("error");
		}
	};
	/** Opens the saved content's preview in a new tab, which unsaved edits don't reach. */
	const openInTab = async () => {
		const previewWindow = window.open("about:blank", "_blank");
		if (previewWindow) previewWindow.opener = null;
		if (document.dirty()) {
			spawnToast({
				title: T()("preview.saved.url.title"),
				message: T()("preview.saved.url.message"),
				status: "warning",
			});
		}
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
					document.collectionKey(),
					document.documentId(),
					document.versionType(),
					document.versionId(),
					props.preview.mode(),
					props.preview.locale(),
					routeKey(),
					props.preview.restarts(),
				] as const,
			([open, collectionKey, documentId], previous) => {
				if (!open) return;
				const sameDocument =
					previous?.[0] === true &&
					previous[1] === collectionKey &&
					previous[2] === documentId;
				void resolve(sameDocument);
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
		on(props.preview.saveStamp, (next, previous) => {
			if (previous === undefined || next === previous || !props.open()) return;
			scheduleSync(true);
		}),
	);

	// ----------------------------------
	// Lifecycle
	onCleanup(() => {
		resolveSequence += 1;
		window.clearTimeout(syncTimer);
		session = null;
	});

	return {
		/** The URL the frame loads, or null while there's none. */
		url,
		state,
		frameLoading,
		setFrameLoading,
		/** Whether a new tab's preview is being made. */
		opening: () => createPreview.action.isPending,
		/** Loads a new session, keeping the scroll position. */
		refresh: () => void resolve(true),
		/** Tries again after a session couldn't be made. */
		retry: () => void resolve(),
		openInTab: () => void openInTab(),
	};
};
