import type { CollectionPreviewBreakpoint, PreviewMode } from "@types";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidChevronDown,
	FaSolidCopy,
	FaSolidRotate,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	type Setter,
	Show,
} from "solid-js";
import Button from "@/components/Partials/Button";
import T, { translateAdminCopy } from "@/translations";
import { PreviewHelp } from "./PreviewHelp";
import { PreviewStatus } from "./PreviewStatus";

export type PreviewWidthSelection =
	| "fit"
	| "custom"
	| {
			type: "breakpoint";
			key: string;
	  };
export type PreviewZoom = 25 | 50 | 75 | 100;
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
const zoomOptions: PreviewZoom[] = [25, 50, 75, 100];

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
	actionLoading: Accessor<boolean>;
	onRefresh: () => void;
	onCopy: () => void;
	onOpen: () => void;
	onRetry: () => void;
}> = (props) => {
	// ----------------------------------
	// Refs
	let canvasRef: HTMLDivElement | undefined;
	let resizeObserver: ResizeObserver | undefined;
	let viewportResizeHandle: HTMLButtonElement | undefined;
	let viewportResizePointerId: number | undefined;
	let viewportResizeStartX = 0;
	let viewportResizeStartWidth = 0;
	let viewportResizeDirection: "left" | "right" = "right";

	// ----------------------------------
	// State
	const [canvasWidth, setCanvasWidth] = createSignal(0);
	const [viewportResizing, setViewportResizing] = createSignal(false);

	// ----------------------------------
	// Memos
	const availableCanvasWidth = createMemo(() =>
		Math.max(canvasWidth() - 20, 0),
	);
	const zoomScale = createMemo(() => props.zoom() / 100);
	const maximumLayoutWidth = createMemo(() =>
		Math.max(availableCanvasWidth() / zoomScale(), 0),
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
	const selectedWidthValue = createMemo(() => {
		const selection = props.selectedWidth();
		return typeof selection === "object"
			? `breakpoint:${selection.key}`
			: selection;
	});
	const requestedWidth = createMemo(() => {
		const selection = props.selectedWidth();
		if (selection === "fit") return maximumLayoutWidth();
		if (selection === "custom") return props.customWidth();
		return (
			widthOptions().find((option) => option.key === selection.key)?.width ??
			maximumLayoutWidth()
		);
	});
	const layoutWidth = createMemo(() => {
		return Math.min(maximumLayoutWidth(), requestedWidth());
	});
	const visualWidth = createMemo(() => layoutWidth() * zoomScale());
	const frameName = createMemo(() =>
		props.previewMode() === "scoped"
			? "lucid-builder-preview:scoped"
			: "lucid-builder-preview:perspective",
	);

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
		const delta =
			((event.clientX - viewportResizeStartX) * direction * 2) / zoomScale();
		const maximumWidth = Math.max(maximumLayoutWidth(), 1);
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
		<div class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card-base">
			<div class="flex h-12 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-border bg-background-base px-3">
				<div class="flex shrink-0 items-center gap-2">
					<div class="relative">
						<select
							value={selectedWidthValue()}
							aria-label={T()("preview.width.mode")}
							class="h-8 min-w-30 appearance-none rounded-md border border-border bg-input-base py-0 pr-7 pl-2 text-sm font-medium text-subtitle outline-none transition-colors focus:border-primary-base"
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
						<FaSolidChevronDown
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
						class="h-8 w-18 appearance-none rounded-md border border-border bg-input-base px-2 text-sm font-medium tabular-nums text-subtitle outline-none transition-colors focus:border-primary-base"
						onInput={(event) => setWidth(event.currentTarget.value, false)}
						onChange={(event) => setWidth(event.currentTarget.value, true)}
						onKeyDown={(event) => {
							if (event.key === "Enter") event.currentTarget.blur();
						}}
					/>
					<div class="relative">
						<select
							value={String(props.zoom())}
							aria-label={T()("preview.zoom")}
							class="h-8 w-19 appearance-none rounded-md border border-border bg-input-base py-0 pr-7 pl-2 text-sm font-medium tabular-nums text-subtitle outline-none transition-colors focus:border-primary-base"
							onChange={(event) => selectZoom(event.currentTarget.value)}
						>
							{zoomOptions.map((zoom) => (
								<option value={String(zoom)}>{zoom}%</option>
							))}
						</select>
						<FaSolidChevronDown
							size={10}
							class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-body"
						/>
					</div>
				</div>
				<div class="flex shrink-0 items-center gap-1.5">
					<PreviewStatus mode={props.previewMode()} />
					<div class="flex items-center gap-0.5">
						<PreviewHelp mode={props.previewMode()} />
						<Button
							type="button"
							theme="secondary-subtle"
							size="icon-subtle"
							title={T()("common.refresh")}
							aria-label={T()("common.refresh")}
							onClick={props.onRefresh}
						>
							<FaSolidRotate size={12} />
						</Button>
						<Button
							type="button"
							theme="secondary-subtle"
							size="icon-subtle"
							title={T()("preview.copy.url")}
							aria-label={T()("preview.copy.url")}
							loading={props.actionLoading()}
							onClick={props.onCopy}
						>
							<FaSolidCopy size={12} />
						</Button>
						<Button
							type="button"
							theme="secondary-subtle"
							size="icon-subtle"
							title={T()("preview.open")}
							aria-label={T()("preview.open")}
							loading={props.actionLoading()}
							onClick={props.onOpen}
						>
							<FaSolidArrowUpRightFromSquare size={12} />
						</Button>
					</div>
				</div>
			</div>
			<div
				ref={setCanvasRef}
				class="relative min-h-0 min-w-0 grow overflow-hidden bg-card-base dotted-background"
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
							theme="border-outline"
							size="small"
							classes="mt-4"
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
							class="group relative z-30 flex h-full w-2.5 shrink-0 cursor-ew-resize items-center justify-center bg-[#242424] transition-colors hover:bg-[#303030] focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-base"
							onPointerDown={(event) => startViewportResize("left", event)}
						>
							<span class="flex items-center gap-0.5" aria-hidden="true">
								<span class="h-7 w-px rounded-full bg-unfocused/80" />
								<span class="h-7 w-px rounded-full bg-unfocused/80" />
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
							<Show when={viewportResizing()}>
								<div class="absolute inset-0 z-40 cursor-ew-resize" />
							</Show>
						</div>
						<button
							type="button"
							aria-label={T()("preview.resize.viewport.right")}
							class="group relative z-30 flex h-full w-2.5 shrink-0 cursor-ew-resize items-center justify-center bg-[#242424] transition-colors hover:bg-[#303030] focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-base"
							onPointerDown={(event) => startViewportResize("right", event)}
						>
							<span class="flex items-center gap-0.5" aria-hidden="true">
								<span class="h-7 w-px rounded-full bg-unfocused/80" />
								<span class="h-7 w-px rounded-full bg-unfocused/80" />
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
					<div
						class="absolute inset-0 z-20 bg-card-base"
						role="status"
						aria-live="polite"
					>
						<span class="sr-only">{T()("preview.loading")}</span>
						<span
							class="skeleton-shimmer block h-full w-full"
							aria-hidden="true"
						/>
					</div>
				</Show>
			</div>
		</div>
	);
};
