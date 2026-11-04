import type { CollectionPreviewBreakpoint, PreviewMode } from "@types";
import classNames from "classnames";
import {
	TbOutlineChevronDown,
	TbOutlineCopy,
	TbOutlineExternalLink,
	TbOutlinePointer,
	TbOutlineRotateClockwise2,
	TbOutlineZoomReset,
} from "solid-icons/tb";
import {
	type Accessor,
	type Component,
	createEffect,
	type JSXElement,
	createMemo,
	createSignal,
	Index,
	onCleanup,
	onMount,
	type Setter,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import HoverRevealBar from "@/components/HoverRevealBar/HoverRevealBar";
import { useHoverReveal } from "@/hooks/useHoverReveal/useHoverReveal";
import { previewFrameNames } from "@/preview/protocol";
import T, { translateAdminCopy } from "@/translations";
import { PreviewLoading } from "./PreviewLoading";

export type PreviewWidthSelection =
	| "fit"
	| "custom"
	| {
			type: "breakpoint";
			key: string;
	  };
/** `fit` shrinks a breakpoint or custom width that's wider than the canvas until it fits. */
export type PreviewZoom = "fit" | 25 | 50 | 75 | 100;
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
const zoomOptions: PreviewZoom[] = ["fit", 25, 50, 75, 100];

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
	onCopy: () => void;
	onOpen: () => void;
	onRetry: () => void;
	/** Drawn over the page at its zoom, such as edit controls. */
	overlay?: (viewport: {
		scale: Accessor<number>;
		width: Accessor<number>;
	}) => JSXElement;
}> = (props) => {
	// ----------------------------------
	// Refs
	let canvasRef: HTMLDivElement | undefined;
	let dockRef: HTMLDivElement | undefined;
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
	//* the options dock stays out of the page's way until the pointer rests near the bottom
	const dock = useHoverReveal({ element: () => dockRef });

	// ----------------------------------
	// Memos
	const availableCanvasWidth = createMemo(() =>
		Math.max(canvasWidth() - 20, 0),
	);
	const widthOptions = createMemo(() => {
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
	const selectedWidthValue = createMemo(() => {
		const selection = props.selectedWidth();
		return typeof selection === "object"
			? `breakpoint:${selection.key}`
			: selection;
	});
	const requestedWidth = createMemo(
		() => explicitWidth() ?? maximumLayoutWidth(),
	);
	const layoutWidth = createMemo(() => {
		return Math.min(maximumLayoutWidth(), requestedWidth());
	});
	const visualWidth = createMemo(() => layoutWidth() * zoomScale());
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
	const selectWidth = (value: string) => {
		if (value === "fit") {
			props.setSelectedWidth(value);
			return;
		}
		if (value === "custom") {
			props.setCustomWidth(Math.round(layoutWidth()));
			props.setSelectedWidth(value);
			return;
		}

		const key = value.startsWith("breakpoint:")
			? value.slice("breakpoint:".length)
			: null;
		if (!key || !widthOptions().some((option) => option.key === key)) return;
		props.setSelectedWidth({ type: "breakpoint", key });
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
	const selectZoom = (value: string) => {
		switch (value) {
			case "fit":
				props.setZoom("fit");
				break;
			case "25":
				props.setZoom(25);
				break;
			case "50":
				props.setZoom(50);
				break;
			case "75":
				props.setZoom(75);
				break;
			case "100":
				props.setZoom(100);
				break;
		}
	};

	// ----------------------------------
	// Effects
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
	});

	// ----------------------------------
	// Render
	return (
		<div
			ref={setCanvasRef}
			class="relative h-full min-h-0 min-w-0 overflow-hidden bg-card dotted-background"
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
						class="relative h-full overflow-hidden bg-white shadow-sm"
						style={{ width: `${visualWidth()}px` }}
					>
						<div
							class="absolute top-0 left-0 bg-white"
							style={{
								width: `${layoutWidth()}px`,
								height: `${100 / zoomScale()}%`,
								transform: `scale(${zoomScale()})`,
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
						{props.overlay?.({ scale: zoomScale, width: visualWidth })}
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
			<div class="pointer-events-none absolute inset-x-3 bottom-0 z-40 flex justify-center">
				<div
					ref={dockRef}
					class={classNames("relative flex max-w-full px-4 pt-4 pb-4", {
						"pointer-events-auto": dock.revealed(),
					})}
					onPointerEnter={dock.handlers.onPointerEnter}
					onPointerLeave={dock.handlers.onPointerLeave}
					onFocusIn={dock.handlers.onFocusIn}
					onFocusOut={dock.handlers.onFocusOut}
				>
					<span
						aria-hidden="true"
						class="group pointer-events-auto absolute inset-x-0 bottom-0 h-8"
					>
						<HoverRevealBar
							orientation="horizontal"
							hidden={dock.revealed()}
							class="bottom-2 left-1/2 -translate-x-1/2"
						/>
					</span>
					<div
						role="group"
						aria-label={T()("preview.options")}
						class={classNames(
							"relative flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-popover/90 p-1.5 shadow-lg backdrop-blur-md transition-[translate,opacity] duration-300 ease-emphasized motion-reduce:transition-none",
							{
								"translate-y-[calc(100%+1rem)] opacity-0": !dock.revealed(),
							},
						)}
					>
						<div class="relative shrink-0">
							<select
								value={selectedWidthValue()}
								aria-label={T()("preview.width.mode")}
								class="h-8 min-w-30 appearance-none rounded-md border border-border bg-input py-0 pr-7 pl-2 text-sm font-medium text-subtitle outline-none transition-colors focus:border-primary"
								onChange={(event) => selectWidth(event.currentTarget.value)}
							>
								<option value="fit">{T()("preview.width.fit")}</option>
								{widthOptions().map((option) => (
									<option value={`breakpoint:${option.key}`}>
										{option.label}
									</option>
								))}
								<option value="custom">{T()("preview.width.custom")}</option>
							</select>
							<TbOutlineChevronDown
								size={10}
								class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-body"
							/>
						</div>
						<input
							type="number"
							value={Math.round(layoutWidth())}
							min={MIN_PREVIEW_WIDTH}
							max={MAX_PREVIEW_WIDTH}
							aria-label={T()("preview.width.input")}
							class="h-8 w-18 shrink-0 appearance-none rounded-md border border-border bg-input px-2 text-sm font-medium tabular-nums text-subtitle outline-none transition-colors focus:border-primary"
							onInput={(event) => setWidth(event.currentTarget.value, false)}
							onChange={(event) => setWidth(event.currentTarget.value, true)}
							onKeyDown={(event) => {
								if (event.key === "Enter") event.currentTarget.blur();
							}}
						/>
						<div class="relative shrink-0">
							<select
								value={String(props.zoom())}
								aria-label={T()("preview.zoom")}
								class="h-8 w-27 appearance-none rounded-md border border-border bg-input py-0 pr-7 pl-2 text-sm font-medium tabular-nums text-subtitle outline-none transition-colors focus:border-primary"
								onChange={(event) => selectZoom(event.currentTarget.value)}
							>
								<Index each={zoomOptions}>
									{(zoom) => (
										<option value={String(zoom())}>
											{zoom() === "fit"
												? T()("preview.zoom.fit", {
														zoom: Math.round(zoomScale() * 100),
													})
												: `${zoom()}%`}
										</option>
									)}
								</Index>
							</select>
							<TbOutlineChevronDown
								size={10}
								class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-body"
							/>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							shape="square"
							title={T()("preview.reset")}
							aria-label={T()("preview.reset")}
							class="disabled:opacity-40!"
							disabled={
								props.selectedWidth() === "fit" && props.zoom() === "fit"
							}
							onClick={() => {
								props.setSelectedWidth("fit");
								props.setZoom("fit");
							}}
						>
							<TbOutlineZoomReset size={12} />
						</Button>
						<span
							aria-hidden="true"
							class="mx-0.5 h-5 w-px shrink-0 bg-border"
						/>
						<div class="flex shrink-0 items-center gap-0.5">
							<Button
								type="button"
								variant={props.editMode() ? "secondary" : "ghost"}
								size="xs"
								shape="square"
								title={T()("preview.edit.label")}
								aria-label={T()("preview.edit.label")}
								aria-pressed={props.editMode()}
								onClick={props.onToggleEditMode}
							>
								<TbOutlinePointer size={12} />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								shape="square"
								title={T()("common.refresh")}
								aria-label={T()("common.refresh")}
								onClick={props.onRefresh}
							>
								<TbOutlineRotateClockwise2 size={12} />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								shape="square"
								title={T()("preview.copy.url")}
								aria-label={T()("preview.copy.url")}
								loading={props.actionLoading()}
								onClick={props.onCopy}
							>
								<TbOutlineCopy size={12} />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								shape="square"
								title={T()("preview.open")}
								aria-label={T()("preview.open")}
								loading={props.actionLoading()}
								onClick={props.onOpen}
							>
								<TbOutlineExternalLink size={12} />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
