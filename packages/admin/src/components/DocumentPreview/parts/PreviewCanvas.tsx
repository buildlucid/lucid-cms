import { previewFrameName } from "@lucidcms/client/contract";
import type { CollectionPreviewBreakpoint } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createRenderEffect,
	createSignal,
	type JSXElement,
	on,
	onCleanup,
	onMount,
	type Setter,
	Show,
	untrack,
} from "solid-js";
import Button from "@/components/Button/Button";
import {
	type PreviewToolbarItem,
	usePreviewContext,
} from "@/hooks/useDocumentPreview/useDocumentPreview";
import T, { translateAdminCopy } from "@/translations";
import type { PreviewPageState } from "../types";
import { PreviewLoading } from "./PreviewLoading";
import { PreviewWidthControl } from "./PreviewWidthControl";
import { PreviewZoomControl } from "./PreviewZoomControl";

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
//* room either side of a resizable page for its handles
const RESIZE_GUTTER = 20;

/**
 * Displays the preview or its unavailable state on a dotted canvas. Resizable pages have handles
 * and width/zoom controls; others fill the canvas.
 */
export const PreviewCanvas: Component<{
	frameSrc: Accessor<string | undefined>;
	pageState: Accessor<PreviewPageState>;
	frameLoading: Accessor<boolean>;
	setFrameLoading: Setter<boolean>;
	setFrameRef: (element: HTMLIFrameElement) => void;
	breakpoints: Accessor<CollectionPreviewBreakpoint[]>;
	resizable: boolean;
	onRetry: () => void;
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
	// State & Hooks
	const context = usePreviewContext();
	const [canvasWidth, setCanvasWidth] = createSignal(0);
	const [selectedWidth, setSelectedWidth] =
		createSignal<PreviewWidthSelection>("fit");
	const [customWidth, setCustomWidth] = createSignal(768);
	const [zoom, setZoom] = createSignal<PreviewZoom>("fit");
	const [viewportResizing, setViewportResizing] = createSignal(false);
	let zoomFrame: number | undefined;
	let zooming = false;

	// ----------------------------------
	// Memos
	const gutter = () => (props.resizable ? RESIZE_GUTTER : 0);
	const availableCanvasWidth = createMemo(() =>
		Math.max(canvasWidth() - gutter(), 0),
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
		const selection = selectedWidth();
		if (!props.resizable || selection === "fit") return null;
		if (selection === "custom") return customWidth();
		return (
			widthOptions().find((option) => option.key === selection.key)?.width ??
			null
		);
	});
	const zoomScale = createMemo(() => {
		const level = props.resizable ? zoom() : "fit";
		if (level !== "fit") return level / 100;
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
			zoom() === "fit" ? MAX_PREVIEW_WIDTH : Math.max(maximumLayoutWidth(), 1);
		const minimumWidth = Math.min(MIN_PREVIEW_WIDTH, maximumWidth);
		setCustomWidth(
			Math.round(
				Math.min(
					maximumWidth,
					Math.max(minimumWidth, viewportResizeStartWidth + delta),
				),
			),
		);
		setSelectedWidth("custom");
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
		setCustomWidth(
			clamp
				? Math.min(MAX_PREVIEW_WIDTH, Math.max(MIN_PREVIEW_WIDTH, width))
				: width,
		);
		setSelectedWidth("custom");
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
	const resizeHandle = (direction: "left" | "right") => (
		<button
			type="button"
			aria-label={T()(
				direction === "left"
					? "preview.resize.viewport.left"
					: "preview.resize.viewport.right",
			)}
			class="group relative z-30 flex h-full w-2.5 shrink-0 cursor-ew-resize items-center justify-center bg-(--lucid-preview-resizer) transition-colors hover:bg-(--lucid-preview-resizer-hover) focus-ring"
			onPointerDown={(event) => startViewportResize(direction, event)}
		>
			<span class="flex items-center gap-0.5" aria-hidden="true">
				<span class="h-7 w-px rounded-full bg-muted/80" />
				<span class="h-7 w-px rounded-full bg-muted/80" />
			</span>
		</button>
	);
	const sizeItems: PreviewToolbarItem[] = [
		{
			key: "width",
			render: () => (
				<PreviewWidthControl
					widthOptions={widthOptions}
					selectedWidth={selectedWidth}
					onSelectWidth={setSelectedWidth}
					layoutWidth={layoutWidth}
					onWidth={setWidth}
				/>
			),
		},
		{
			key: "zoom",
			render: () => (
				<PreviewZoomControl
					zoom={zoom}
					zoomScale={zoomScale}
					onZoom={setZoom}
				/>
			),
		},
	];

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
		const selection = selectedWidth();
		if (
			typeof selection === "object" &&
			!widthOptions().some((option) => option.key === selection.key)
		) {
			setSelectedWidth("fit");
		}
	});
	createRenderEffect(() => {
		if (props.resizable) context.addToolbarItems(sizeItems);
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
			<Show
				when={
					props.pageState() === "unsaved" || props.pageState() === "unavailable"
				}
			>
				<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-6 text-center">
					<h3 class="font-medium text-title">
						{props.pageState() === "unsaved"
							? T()("preview.unsaved.title")
							: T()("preview.unavailable.title")}
					</h3>
					<p class="max-w-md text-sm text-body">
						{props.pageState() === "unsaved"
							? T()("preview.unsaved.message")
							: T()("preview.unavailable.message")}
					</p>
				</div>
			</Show>
			<Show when={props.pageState() === "error"}>
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

			<Show when={props.pageState() === "ready" && props.frameSrc()}>
				<div
					class="relative mx-auto flex h-full"
					style={{ width: `${visualWidth() + gutter()}px` }}
				>
					<Show when={props.resizable}>{resizeHandle("left")}</Show>
					<div
						class="relative h-full overflow-clip bg-white shadow-raised"
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
								name={previewFrameName}
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
					<Show when={props.resizable}>{resizeHandle("right")}</Show>
				</div>
			</Show>
			<Show
				when={
					props.pageState() === "loading" ||
					props.pageState() === "idle" ||
					props.frameLoading()
				}
			>
				<PreviewLoading width={visualWidth() || undefined} />
			</Show>
		</div>
	);
};
