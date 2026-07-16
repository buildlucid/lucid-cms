import type { PreviewFieldTarget } from "@lucidcms/preview-protocol";
import type {
	CollectionPreviewBreakpoint,
	DocumentVersionType,
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
} from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import { createPreviewBridge } from "@/utils/preview-bridge";
import spawnToast from "@/utils/spawn-toast";
import {
	PreviewCanvas,
	type PreviewWidthSelection,
	type PreviewZoom,
	type ResolverState,
} from "./PreviewCanvas";

export const DocumentPreview: Component<{
	open: Accessor<boolean>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	versionType: Accessor<DocumentVersionType>;
	versionId: Accessor<number | undefined>;
	mode: Accessor<PreviewMode>;
	locale: Accessor<string>;
	breakpoints: Accessor<CollectionPreviewBreakpoint[]>;
	dirty: Accessor<boolean>;
	saveStamp: Accessor<string>;
	onFocusField: (target: PreviewFieldTarget) => void;
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	let resolveSequence = 0;
	const [url, setUrl] = createSignal<string | null>(null);
	const [resolverState, setResolverState] = createSignal<ResolverState>("idle");
	const [frameLoading, setFrameLoading] = createSignal(false);
	const [selectedWidth, setSelectedWidth] =
		createSignal<PreviewWidthSelection>("fit");
	const [customWidth, setCustomWidth] = createSignal(768);
	const [zoom, setZoom] = createSignal<PreviewZoom>(100);
	const previewBridge = createPreviewBridge({
		onFocusField: props.onFocusField,
	});

	// -------------------------------
	// Queries & Mutations
	const createPreview = api.documents.useCreatePreview();

	// ----------------------------------
	// Memos
	const frameSrc = createMemo(() => url() ?? undefined);

	// ----------------------------------
	// Functions
	const createPersistedPreviewUrl = async () => {
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
		return response.data.url;
	};
	const resolvePersistedPreview = async (preserveScroll = false) => {
		const currentResolve = ++resolveSequence;
		if (!preserveScroll) previewBridge.queueScrollRestore(null);
		try {
			const scrollState = preserveScroll
				? await previewBridge.captureScroll()
				: null;
			if (currentResolve !== resolveSequence) return;

			setResolverState("loading");
			const nextUrl = await createPersistedPreviewUrl();
			if (currentResolve !== resolveSequence) return;
			if (!nextUrl) {
				previewBridge.queueScrollRestore(null);
				setUrl(null);
				setFrameLoading(false);
				setResolverState("unavailable");
				return;
			}

			setFrameLoading(true);
			previewBridge.queueScrollRestore(scrollState, nextUrl);
			setUrl(nextUrl);
			setResolverState("ready");
		} catch {
			if (currentResolve !== resolveSequence) return;
			previewBridge.queueScrollRestore(null);
			setFrameLoading(false);
			setResolverState("error");
		}
	};
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
			const persistedUrl = await createPersistedPreviewUrl();
			if (!persistedUrl) {
				spawnToast({
					title: T()("preview.unavailable.title"),
					message: T()("preview.unavailable.message"),
					status: "warning",
				});
				return;
			}
			await navigator.clipboard.writeText(persistedUrl);
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
			const persistedUrl = await createPersistedPreviewUrl();
			if (!persistedUrl) {
				previewWindow?.close();
				spawnToast({
					title: T()("preview.unavailable.title"),
					message: T()("preview.unavailable.message"),
					status: "warning",
				});
				return;
			}
			if (previewWindow) {
				previewWindow.location.replace(persistedUrl);
				return;
			}
			window.open(persistedUrl, "_blank", "noopener,noreferrer");
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
				] as const,
			(
				[open, collectionKey, documentId, versionType, versionId, mode, locale],
				previous,
			) => {
				if (!open) return;
				const localeChanged =
					previous?.[0] === true &&
					previous[1] === collectionKey &&
					previous[2] === documentId &&
					previous[3] === versionType &&
					previous[4] === versionId &&
					previous[5] === mode &&
					previous[6] !== locale;
				void resolvePersistedPreview(localeChanged);
			},
		),
	);
	createEffect(
		on(props.saveStamp, (next, previous) => {
			if (previous === undefined || next === previous || !props.open()) return;
			void resolvePersistedPreview(true);
		}),
	);

	// ----------------------------------
	// Lifecycle
	onCleanup(() => {
		resolveSequence += 1;
		previewBridge.cleanup();
	});

	// ----------------------------------
	// Render
	return (
		<section class="h-full min-h-0 min-w-0 overflow-hidden rounded-t-xl border-t border-border bg-card-base xl:rounded-tl-none xl:border-l xl:border-t-0">
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
				actionLoading={() => createPreview.action.isPending}
				onRefresh={() => void resolvePersistedPreview(true)}
				onCopy={() => void copyPersistedUrl()}
				onOpen={() => void openPersistedUrl()}
				onRetry={() => void resolvePersistedPreview()}
			/>
		</section>
	);
};
