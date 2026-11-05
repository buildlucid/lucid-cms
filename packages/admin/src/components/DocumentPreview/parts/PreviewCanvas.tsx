import type { CollectionPreviewBreakpoint, PreviewMode } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	type JSXElement,
	createMemo,
	createSignal,
	on,
	onCleanup,
	onMount,
	type Setter,
	Show,
	untrack,
} from "solid-js";
import { Portal } from "solid-js/web";
import Button from "@/components/Button/Button";
import { previewFrameNames } from "@/preview/protocol";
import T, { translateAdminCopy } from "@/translations";
import { PreviewLoading } from "./PreviewLoading";
import { PreviewToolbar } from "./PreviewToolbar";

export type PreviewWidthSelection =
	| "fit"
	| "custom"
	| {
			type: "breakpoint";
			key: string;
	  };
/** `fit` shrinks a breakpoint or custom width that's wider than the canvas until it fits. */
export type PreviewZoom = "fit" | 25 | 50 | 75 | 100;
/** A breakpoint the preview can be sized to. */
export type PreviewWidthOption = { key: string; width: number; label: string };
export type ResolverState =
	| "idle"
	| "loading"
	| "ready"
	| "unavailable"
	| "error";

const MIN_PREVIEW_WIDTH = 280;
const MAX_PREVIEW_WIDTH = 2560;

const defaultBreakpoints: Array<{
	key: string;
	width: number;
	label: () => string;
}> = [
	{
		key: "desktop",
		width: 1440,
		label: () => T()("preview.width.desktop"),
	},
	{
		key: "tablet",
		width: 768,
		label: () => T()("preview.width.tablet"),
	},
	{
		key: "mobile",
		width: 390,
		label: () => T()("preview.width.mobile"),
	},
];
//* how far the page zooms out while a brick is dragged, unless it's already smaller, and how long that takes
const ZOOMED_OUT_SCALE = 0.5;
const ZOOM_MS = 320;

export const PreviewCanvas: Component<{
	frameSrc: Accessor<string | undefined>;
	resolverState: Accessor<ResolverState>;
	frameLoading: Accessor<boolean>;
	setFrameLoading: Setter<boolean>;
	setFrameRef: (element: HTMLIFrameElement) => void;
	breakpoints: Accessor<CollectionPreviewBreakpoint[]>;
	selectedWidth: Accessor<PreviewWidthSelection>;
	setSelectedWidth: Setter<PreviewWidthSelection>;
	customWidth: Accessor<number>;
	setCustomWidth: Setter<number>;
	zoom: Accessor<PreviewZoom>;
	setZoom: Setter<PreviewZoom>;
	previewMode: Accessor<PreviewMode>;
	editMode: Accessor<boolean>;
	onToggleEditMode: () => void;
	actionLoading: Accessor<boolean>;
	onRefresh: () => void;
	onOpen: () => void;
	onRetry: () => void;
	/** Where the preview's controls render, in the page builder header above it. */
	toolbarMount?: Accessor<HTMLElement | undefined>;
	/** Zooms the page out, keeping its layout, eg. while a brick is dragged, to show more of where it can go. */
	zoomedOut?: Accessor<boolean>;
	/** Runs as zooming out or back in starts and ends, so the page can keep what's dragged or selected in place. */
	onZoomingChange?: (zooming: boolean) => void;
	/** Drawn over the page at its zoom, such as edit controls. */
	overlay?: (viewport: {
		scale: Accessor<number>;
		width: Accessor<number>;
	}) => JSXElement;
}> = (props) => {
	// ----------------------------------
	// Refs
	let canvasRef: HTMLDivElement | undefined;
	let resizeObserver: ResizeObserver | undefined;
	let viewportResizeHandle: HTMLButtonElement | undefined;
	let viewportResizePointerId: number | undefined;
	let viewportResizeStartX = 0;
	let viewportResizeStartWidth = 0;
	let viewportResizeStartScale = 1;
	let viewportResizeDirection: "left" | "right" = "right";

	// ----------------------------------
	// State
	const [canvasWidth, setCanvasWidth] = createSignal(0);
	const [viewportResizing, setViewportResizing] = createSignal(false);
	let zoomFrame: number | undefined;
	let zooming = false;

	// ----------------------------------
	// Memos
	const availableCanvasWidth = createMemo(() =>
		Math.max(canvasWidth() - 20, 0),
	);
	const widthOptions = createMemo((): PreviewWidthOption[] => {
		const breakpoints = props.breakpoints();
		if (breakpoints.length === 0) {
			return defaultBreakpoints.map((breakpoint) => ({
				key: breakpoint.key,
				width: breakpoint.width,
				label: breakpoint.label(),
			}));
		}

		return breakpoints.map((breakpoint) => ({
			key: breakpoint.key,
			width: breakpoint.width,
			label: translateAdminCopy(breakpoint.label),
		}));
	});
	//* a breakpoint or custom width, or null while the page fills the canvas
	const explicitWidth = createMemo(() => {
		const selection = props.selectedWidth();
		if (selection === "fit") return null;
		if (selection === "custom") return props.customWidth();
		return (
			widthOptions().find((option) => option.key === selection.key)?.width ??
			null
		);
	});
	const zoomScale = createMemo(() => {
		const zoom = props.zoom();
		if (zoom !== "fit") return zoom / 100;
		const width = explicitWidth();
		if (width === null || availableCanvasWidth() === 0) return 1;
		return Math.min(1, availableCanvasWidth() / width);
	});
	const maximumLayoutWidth = createMemo(() =>
		Math.max(availableCanvasWidth() / zoomScale(), 0),
	);
	const requestedWidth = createMemo(
		() => explicitWidth() ?? maximumLayoutWidth(),
	);
	const layoutWidth = createMemo(() => {
		return Math.min(maximumLayoutWidth(), requestedWidth());
	});
	//* zooming out keeps the page's layout width, so its breakpoints don't change while a brick is dragged
	const targetScale = createMemo(() =>
		props.zoomedOut?.() ? Math.min(zoomScale(), ZOOMED_OUT_SCALE) : zoomScale(),
	);
	//* the scale the page is drawn at, easing to the target as it zooms out or back in
	const [displayScale, setDisplayScale] = createSignal(untrack(targetScale));
	const visualWidth = createMemo(() => layoutWidth() * displayScale());
	const frameName = createMemo(() => previewFrameNames[props.previewMode()]);

	// ----------------------------------
	// Functions
	const updateCanvasSize = () => {
		setCanvasWidth(canvasRef?.clientWidth ?? 0);
	};
	const setCanvasRef = (element: HTMLDivElement) => {
		canvasRef = element;
		resizeObserver?.observe(element);
		updateCanvasSize();
	};
	const resizeViewport = (event: PointerEvent) => {
		const direction = viewportResizeDirection === "right" ? 1 : -1;
		//* the scale it started at, as fit zoom rescales while the width changes
		const delta =
			((event.clientX - viewportResizeStartX) * direction * 2) /
			viewportResizeStartScale;
		//* fit zoom shrinks any width to fit, so only the canvas limits other zooms
		const maximumWidth =
			props.zoom() === "fit"
				? MAX_PREVIEW_WIDTH
				: Math.max(maximumLayoutWidth(), 1);
		const minimumWidth = Math.min(MIN_PREVIEW_WIDTH, maximumWidth);
		props.setCustomWidth(
			Math.round(
				Math.min(
					maximumWidth,
					Math.max(minimumWidth, viewportResizeStartWidth + delta),
				),
			),
		);
		props.setSelectedWidth("custom");
	};
	const stopViewportResize = () => {
		window.removeEventListener("pointermove", resizeViewport);
		window.removeEventListener("pointerup", stopViewportResize);
		window.removeEventListener("pointercancel", stopViewportResize);
		window.removeEventListener("blur", stopViewportResize);
		if (
			viewportResizeHandle &&
			viewportResizePointerId !== undefined &&
			viewportResizeHandle.hasPointerCapture(viewportResizePointerId)
		) {
			viewportResizeHandle.releasePointerCapture(viewportResizePointerId);
		}
		viewportResizeHandle = undefined;
		viewportResizePointerId = undefined;
		setViewportResizing(false);
		document.body.style.removeProperty("cursor");
		document.body.style.removeProperty("user-select");
	};
	const startViewportResize = (
		direction: "left" | "right",
		event: PointerEvent,
	) => {
		event.preventDefault();
		event.stopPropagation();
		viewportResizeHandle = event.currentTarget as HTMLButtonElement;
		viewportResizePointerId = event.pointerId;
		viewportResizeStartX = event.clientX;
		viewportResizeStartWidth = layoutWidth();
		viewportResizeStartScale = zoomScale();
		viewportResizeDirection = direction;
		viewportResizeHandle.setPointerCapture(event.pointerId);
		setViewportResizing(true);
		document.body.style.cursor = "ew-resize";
		document.body.style.userSelect = "none";
		window.addEventListener("pointermove", resizeViewport);
		window.addEventListener("pointerup", stopViewportResize);
		window.addEventListener("pointercancel", stopViewportResize);
		window.addEventListener("blur", stopViewportResize);
	};
	const setWidth = (value: string, clamp: boolean) => {
		const width = Number.parseInt(value, 10);
		if (!Number.isFinite(width)) return;
		if (!clamp && (width < MIN_PREVIEW_WIDTH || width > MAX_PREVIEW_WIDTH)) {
			return;
		}
		props.setCustomWidth(
			clamp
				? Math.min(MAX_PREVIEW_WIDTH, Math.max(MIN_PREVIEW_WIDTH, width))
				: width,
		);
		props.setSelectedWidth("custom");
	};
	const setZooming = (next: boolean) => {
		if (zooming === next) return;
		zooming = next;
		props.onZoomingChange?.(next);
	};
	const stopZoom = () => {
		if (zoomFrame !== undefined) cancelAnimationFrame(zoomFrame);
		zoomFrame = undefined;
	};

	// ----------------------------------
	// Effects
	//* zooming out or back in eases there; other changes, such as the canvas resizing, apply at once
	createEffect(
		on(
			() => [targetScale(), props.zoomedOut?.() === true] as const,
			([target, zoomedOut], previous) => {
				stopZoom();
				const from = untrack(displayScale);
				const reducedMotion = window.matchMedia(
					"(prefers-reduced-motion: reduce)",
				).matches;
				if (
					previous === undefined ||
					previous[1] === zoomedOut ||
					from === target ||
					reducedMotion
				) {
					setDisplayScale(target);
					setZooming(false);
					return;
				}
				setZooming(true);
				const start = performance.now();
				const step = (now: number) => {
					const progress = Math.min((now - start) / ZOOM_MS, 1);
					const eased = 1 - (1 - progress) ** 3;
					setDisplayScale(from + (target - from) * eased);
					if (progress < 1) {
						zoomFrame = requestAnimationFrame(step);
						return;
					}
					zoomFrame = undefined;
					setZooming(false);
				};
				zoomFrame = requestAnimationFrame(step);
			},
		),
	);
	createEffect(() => {
		const selection = props.selectedWidth();
		if (
			typeof selection === "object" &&
			!widthOptions().some((option) => option.key === selection.key)
		) {
			props.setSelectedWidth("fit");
		}
	});

	// ----------------------------------
	// Lifecycle
	onMount(() => {
		resizeObserver = new ResizeObserver(updateCanvasSize);
		if (canvasRef) resizeObserver.observe(canvasRef);
		updateCanvasSize();
	});
	onCleanup(() => {
		resizeObserver?.disconnect();
		stopViewportResize();
		stopZoom();
	});

	// ----------------------------------
	// Render
	return (
		<div
			ref={setCanvasRef}
			class="relative isolate h-full min-h-0 min-w-0 overflow-clip bg-card dotted-background"
		>
			<Show when={props.resolverState() === "unavailable"}>
				<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-6 text-center">
					<h3 class="font-medium text-title">
						{T()("preview.unavailable.title")}
					</h3>
					<p class="max-w-md text-sm text-body">
						{T()("preview.unavailable.message")}
					</p>
				</div>
			</Show>
			<Show when={props.resolverState() === "error"}>
				<div class="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
					<h3 class="font-medium text-title">{T()("preview.error.title")}</h3>
					<p class="mt-1 max-w-md text-sm text-body">
						{T()("preview.error.message")}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="mt-4"
						onClick={props.onRetry}
					>
						{T()("preview.retry")}
					</Button>
				</div>
			</Show>

			<Show when={props.resolverState() === "ready" && props.frameSrc()}>
				<div
					class="relative mx-auto flex h-full"
					style={{ width: `${visualWidth() + 20}px` }}
				>
					<button
						type="button"
						aria-label={T()("preview.resize.viewport.left")}
						class="group relative z-30 flex h-full w-2.5 shrink-0 cursor-ew-resize items-center justify-center bg-(--lucid-preview-resizer) transition-colors hover:bg-(--lucid-preview-resizer-hover) focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
						onPointerDown={(event) => startViewportResize("left", event)}
					>
						<span class="flex items-center gap-0.5" aria-hidden="true">
							<span class="h-7 w-px rounded-full bg-muted/80" />
							<span class="h-7 w-px rounded-full bg-muted/80" />
						</span>
					</button>
					<div
						class="relative h-full overflow-clip bg-white shadow-sm"
						style={{ width: `${visualWidth()}px` }}
					>
						<div
							class="absolute top-0 left-0 bg-white"
							style={{
								width: `${layoutWidth()}px`,
								height: `${100 / displayScale()}%`,
								transform: `scale(${displayScale()})`,
								"transform-origin": "top left",
							}}
						>
							<iframe
								ref={props.setFrameRef}
								name={frameName()}
								src={props.frameSrc()}
								title={T()("preview.iframe.title")}
								referrerpolicy="no-referrer"
								class="block h-full w-full border-0 bg-white"
								onLoad={() => props.setFrameLoading(false)}
							/>
						</div>
						{props.overlay?.({ scale: displayScale, width: visualWidth })}
						<Show when={viewportResizing()}>
							<div class="absolute inset-0 z-40 cursor-ew-resize" />
						</Show>
					</div>
					<button
						type="button"
						aria-label={T()("preview.resize.viewport.right")}
						class="group relative z-30 flex h-full w-2.5 shrink-0 cursor-ew-resize items-center justify-center bg-(--lucid-preview-resizer) transition-colors hover:bg-(--lucid-preview-resizer-hover) focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
						onPointerDown={(event) => startViewportResize("right", event)}
					>
						<span class="flex items-center gap-0.5" aria-hidden="true">
							<span class="h-7 w-px rounded-full bg-muted/80" />
							<span class="h-7 w-px rounded-full bg-muted/80" />
						</span>
					</button>
				</div>
			</Show>
			<Show
				when={
					props.resolverState() === "loading" ||
					props.resolverState() === "idle" ||
					props.frameLoading()
				}
			>
				<PreviewLoading width={visualWidth() || undefined} />
			</Show>
			<Show when={props.toolbarMount?.()} keyed>
				{(mount) => (
					<Portal
						mount={mount}
						ref={(element) => element.classList.add("contents")}
					>
						<PreviewToolbar
							widthOptions={widthOptions}
							selectedWidth={props.selectedWidth}
							onSelectWidth={props.setSelectedWidth}
							layoutWidth={layoutWidth}
							onWidth={setWidth}
							zoom={props.zoom}
							zoomScale={zoomScale}
							onZoom={props.setZoom}
							editMode={props.editMode}
							onToggleEditMode={props.onToggleEditMode}
							actionLoading={props.actionLoading}
							onRefresh={props.onRefresh}
							onOpen={props.onOpen}
						/>
					</Portal>
				)}
			</Show>
		</div>
	);
};
