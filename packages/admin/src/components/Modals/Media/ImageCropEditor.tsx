import classNames from "classnames";
import type Cropper from "cropperjs";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import { DegreeRangeControl } from "@/components/Groups/Form/DegreeRangeControl";
import { Label } from "@/components/Groups/Form/Label";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import Spinner from "@/components/Partials/Spinner";
import T from "@/translations";
import {
	canvasToFile,
	type ImageCropProvenance,
	type ImageCropSource,
	isSupportedCropMimeType,
} from "@/utils/image-crop";

type RatioPreset = "free" | "original" | "square" | "16:9" | "4:3" | "3:2";

const RATIO_PRESETS: RatioPreset[] = [
	"free",
	"original",
	"square",
	"16:9",
	"4:3",
	"3:2",
];
const INITIAL_VIEW_SCALE = 0.92;
const SKEW_LIMIT_DEGREES = 45;
const DESKTOP_DRAWER_MEDIA_QUERY = "(min-width: 769px)";

const CROPPER_TEMPLATE = `
	<cropper-canvas background scale-step="0.14">
		<cropper-image rotatable scalable skewable translatable></cropper-image>
		<cropper-shade hidden></cropper-shade>
		<cropper-handle action="move" plain></cropper-handle>
		<cropper-selection initial-coverage="0.5" movable resizable>
			<cropper-grid role="grid" bordered covered></cropper-grid>
			<cropper-crosshair centered></cropper-crosshair>
			<cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
			<cropper-handle action="n-resize"></cropper-handle>
			<cropper-handle action="e-resize"></cropper-handle>
			<cropper-handle action="s-resize"></cropper-handle>
			<cropper-handle action="w-resize"></cropper-handle>
			<cropper-handle action="ne-resize"></cropper-handle>
			<cropper-handle action="nw-resize"></cropper-handle>
			<cropper-handle action="se-resize"></cropper-handle>
			<cropper-handle action="sw-resize"></cropper-handle>
		</cropper-selection>
	</cropper-canvas>
`;

const getFetchUrl = (url: string) => {
	if (!url.includes("?")) return url;
	return url.split("?")[0] || url;
};

const waitForAnimationFrame = () => {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});
};

const ImageCropEditor: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	source: ImageCropSource | null;
	onApply: (
		_file: File,
		_provenance: ImageCropProvenance,
	) => boolean | undefined | Promise<boolean | undefined>;
}> = (props) => {
	// ------------------------------
	// State
	const [sourceUrl, setSourceUrl] = createSignal<string>();
	const [sourceMimeType, setSourceMimeType] = createSignal<string>();
	const [isPreparing, setIsPreparing] = createSignal(false);
	const [isReady, setIsReady] = createSignal(false);
	const [isApplying, setIsApplying] = createSignal(false);
	const [clientError, setClientError] = createSignal<string>();
	const [activeRatio, setActiveRatio] = createSignal<RatioPreset>("free");
	const [naturalRatio, setNaturalRatio] = createSignal<number | null>(null);
	const [rotationDegrees, setRotationDegrees] = createSignal(0);
	const [skewXDegrees, setSkewXDegrees] = createSignal(0);
	const [skewYDegrees, setSkewYDegrees] = createSignal(0);

	// ------------------------------
	// Refs
	let stageRef: HTMLDivElement | undefined;
	let controlsRef: HTMLDivElement | undefined;
	let cropper: Cropper | undefined;

	// ------------------------------
	// Memos
	const sourceName = createMemo(() => props.source?.name || "image");
	const sourceProvenance = createMemo<ImageCropProvenance>(() => {
		return props.source?.provenance ?? { origin: "human" };
	});
	const canApply = createMemo(() => {
		return (
			props.state.open &&
			isReady() &&
			!isPreparing() &&
			!isApplying() &&
			props.source !== null
		);
	});

	// ------------------------------
	// Functions
	function destroyCropper() {
		cropper?.destroy();
		cropper = undefined;
		if (stageRef) stageRef.innerHTML = "";
	}

	function getRatioValue(preset: RatioPreset) {
		if (preset === "free") return null;
		if (preset === "original") return naturalRatio();
		if (preset === "square") return 1;
		if (preset === "16:9") return 16 / 9;
		if (preset === "4:3") return 4 / 3;
		return 3 / 2;
	}

	function normalizeRotation(degrees: number) {
		if (!Number.isFinite(degrees)) return rotationDegrees();

		let normalized = degrees % 360;
		if (normalized > 180) normalized -= 360;
		if (normalized < -180) normalized += 360;
		return Math.round(normalized);
	}

	function setRotation(degrees: number) {
		const nextRotation = normalizeRotation(degrees);
		const delta = normalizeRotation(nextRotation - rotationDegrees());
		if (delta === 0) {
			setRotationDegrees(nextRotation);
			return;
		}

		cropper?.getCropperImage()?.$rotate(`${delta}deg`);
		setRotationDegrees(nextRotation);
	}

	function getInitialViewportLayout() {
		if (!stageRef) return null;

		const stageRect = stageRef.getBoundingClientRect();
		if (stageRect.width <= 0 || stageRect.height <= 0) return null;

		const drawerWidth =
			controlsRef && window.matchMedia(DESKTOP_DRAWER_MEDIA_QUERY).matches
				? Math.max(
						0,
						controlsRef.getBoundingClientRect().right - stageRect.left,
					)
				: 0;

		return {
			offsetX: drawerWidth / 2,
			visibleHeight: stageRect.height,
			visibleWidth: Math.max(1, stageRect.width - drawerWidth),
		};
	}

	function getInitialImageScale() {
		const cropperImage = cropper?.getCropperImage();
		const layout = getInitialViewportLayout();
		if (!cropperImage || !layout) return INITIAL_VIEW_SCALE;

		const imageRect = cropperImage.getBoundingClientRect();
		if (imageRect.width <= 0 || imageRect.height <= 0) {
			return INITIAL_VIEW_SCALE;
		}

		return Math.max(
			0.05,
			Math.min(
				INITIAL_VIEW_SCALE,
				(layout.visibleWidth * INITIAL_VIEW_SCALE) / imageRect.width,
				(layout.visibleHeight * INITIAL_VIEW_SCALE) / imageRect.height,
			),
		);
	}

	function applyInitialViewportTransform() {
		const layout = getInitialViewportLayout();
		const cropperImage = cropper?.getCropperImage();
		if (!layout || !cropperImage) return;

		cropperImage.$scale(getInitialImageScale());
		if (layout.offsetX <= 0) return;

		cropperImage.$move(layout.offsetX, 0);
		cropper?.getCropperSelection()?.$move(layout.offsetX, 0);
	}

	function normalizeSkew(degrees: number, fallback: number) {
		if (!Number.isFinite(degrees)) return fallback;
		return Math.max(
			-SKEW_LIMIT_DEGREES,
			Math.min(SKEW_LIMIT_DEGREES, Math.round(degrees)),
		);
	}

	function setSkew(axis: "x" | "y", degrees: number) {
		const currentX = skewXDegrees();
		const currentY = skewYDegrees();
		const nextX = axis === "x" ? normalizeSkew(degrees, currentX) : currentX;
		const nextY = axis === "y" ? normalizeSkew(degrees, currentY) : currentY;
		const deltaX = nextX - currentX;
		const deltaY = nextY - currentY;

		if (deltaX === 0 && deltaY === 0) {
			setSkewXDegrees(nextX);
			setSkewYDegrees(nextY);
			return;
		}

		cropper?.getCropperImage()?.$skew(`${deltaX}deg`, `${deltaY}deg`);
		setSkewXDegrees(nextX);
		setSkewYDegrees(nextY);
	}

	function applyRatioPreset(preset: RatioPreset) {
		const selection = cropper?.getCropperSelection();
		if (!selection) return;

		setActiveRatio(preset);
		const ratio = getRatioValue(preset);
		selection.aspectRatio = ratio ?? Number.NaN;
		if (!ratio || selection.width === 0 || selection.height === 0) return;

		const currentWidth = selection.width;
		const currentHeight = selection.height;
		let width = currentWidth;
		let height = currentWidth / ratio;
		if (height > currentHeight) {
			height = currentHeight;
			width = currentHeight * ratio;
		}

		selection.$change(
			selection.x + (currentWidth - width) / 2,
			selection.y + (currentHeight - height) / 2,
			width,
			height,
			ratio,
			true,
		);
	}

	async function getSourceScaledCropSize() {
		const selection = cropper?.getCropperSelection();
		const cropperImage = cropper?.getCropperImage();
		if (!selection || !cropperImage) return undefined;

		await cropperImage.$ready();
		const [a, b, c, d] = cropperImage.$getTransform();
		const displayScale = Math.sqrt(Math.abs(a * d - b * c));
		if (!Number.isFinite(displayScale) || displayScale <= 0) return undefined;

		return {
			width: Math.max(1, Math.round(selection.width / displayScale)),
			height: Math.max(1, Math.round(selection.height / displayScale)),
		};
	}

	async function applyCrop() {
		const selection = cropper?.getCropperSelection();
		if (!selection || !props.source) return;

		try {
			setIsApplying(true);
			setClientError(undefined);
			const canvas = await selection.$toCanvas(await getSourceScaledCropSize());
			const file = await canvasToFile({
				canvas,
				fileName: sourceName(),
				mimeType: sourceMimeType() ?? props.source.mimeType,
				quality: 0.92,
			});

			const applied = await props.onApply(file, sourceProvenance());
			if (applied !== false) {
				props.state.setOpen(false);
			}
		} catch (error) {
			setClientError(
				error instanceof Error
					? error.message
					: T()("media.crop.export.failed"),
			);
		} finally {
			setIsApplying(false);
		}
	}

	// ------------------------------
	// Effects
	createEffect(() => {
		const source = props.source;
		if (!props.state.open || !source) return;

		const controller = new AbortController();
		let objectUrl: string | undefined;

		setIsPreparing(true);
		setIsReady(false);
		setClientError(undefined);
		setSourceUrl(undefined);
		setSourceMimeType(undefined);
		setNaturalRatio(null);
		setActiveRatio("free");
		setRotationDegrees(0);
		setSkewXDegrees(0);
		setSkewYDegrees(0);

		void (async () => {
			try {
				let blob: Blob;
				if (source.file) {
					blob = source.file;
				} else if (source.url) {
					const response = await fetch(getFetchUrl(source.url), {
						credentials: "include",
						signal: controller.signal,
					});
					if (!response.ok) {
						throw new Error(T()("media.crop.download.failed"));
					}
					blob = await response.blob();
				} else {
					throw new Error(T()("media.crop.source.missing"));
				}

				const mimeType = blob.type || source.mimeType || undefined;
				if (!isSupportedCropMimeType(mimeType)) {
					throw new Error(T()("media.crop.unsupported"));
				}

				objectUrl = URL.createObjectURL(blob);
				if (controller.signal.aborted) {
					URL.revokeObjectURL(objectUrl);
					return;
				}

				setSourceMimeType(mimeType);
				setSourceUrl(objectUrl);
				setIsPreparing(false);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}

				setClientError(
					error instanceof Error
						? error.message
						: T()("media.crop.download.failed"),
				);
				setIsPreparing(false);
			}
		})();

		onCleanup(() => {
			controller.abort();
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		});
	});

	createEffect(() => {
		const url = sourceUrl();
		if (!props.state.open || !url || !stageRef) return;

		let disposed = false;
		setIsReady(false);

		void (async () => {
			const { default: CropperClass } = await import("cropperjs");
			if (disposed || !stageRef) return;

			destroyCropper();
			const image = new Image();
			image.src = url;
			image.alt = sourceName();
			cropper = new CropperClass(image, {
				container: stageRef,
				template: CROPPER_TEMPLATE,
			});

			const cropperImage = cropper.getCropperImage();
			const loadedImage = await cropperImage?.$ready();
			if (disposed) return;

			if (loadedImage?.naturalWidth && loadedImage.naturalHeight) {
				setNaturalRatio(loadedImage.naturalWidth / loadedImage.naturalHeight);
			}
			await waitForAnimationFrame();
			if (disposed) return;

			applyInitialViewportTransform();
			setIsReady(true);
		})();

		onCleanup(() => {
			disposed = true;
			destroyCropper();
			setIsReady(false);
		});
	});

	createEffect(() => {
		if (!props.state.open) {
			destroyCropper();
			setClientError(undefined);
			setSourceUrl(undefined);
			setIsPreparing(false);
			setIsApplying(false);
			setIsReady(false);
			setRotationDegrees(0);
			setSkewXDegrees(0);
			setSkewYDegrees(0);
		}
	});

	// ------------------------------
	// Render
	return (
		<Modal
			state={props.state}
			options={{
				noPadding: true,
				size: "large",
			}}
		>
			<div class="relative overflow-hidden bg-input-base rectangle-background">
				<div class="relative z-10">
					<div ref={stageRef} class="image-cropper-stage" />
					<Show when={isPreparing()}>
						<div class="absolute inset-0 z-30 flex items-center justify-center bg-background-base/70">
							<Spinner size="md" />
						</div>
					</Show>
				</div>
				<div
					ref={controlsRef}
					class="image-cropper-controls z-40 overflow-y-auto bg-background-base p-4"
				>
					<div class="mb-4">
						<h2 class="text-title text-base font-semibold">
							{T()("media.crop.title")}
						</h2>
						<p class="text-body text-sm mt-1">
							{T()("media.crop.description")}
						</p>
					</div>
					<div class="space-y-4">
						<div>
							<Label
								id="image-crop-aspect-ratio"
								label={T()("media.crop.ratio.label")}
								theme="basic"
								hideOptionalText={true}
							/>
							<div class="grid grid-cols-2 gap-2">
								<For each={RATIO_PRESETS}>
									{(preset) => {
										const disabled = createMemo(
											() =>
												!isReady() ||
												(preset === "original" && naturalRatio() === null),
										);
										return (
											<Button
												type="button"
												theme="secondary-toggle"
												size="small"
												classes="h-8 text-xs"
												active={activeRatio() === preset}
												disabled={disabled()}
												onClick={() => applyRatioPreset(preset)}
											>
												{T()(`media.crop.ratio.${preset}`)}
											</Button>
										);
									}}
								</For>
							</div>
						</div>
						<DegreeRangeControl
							id="image-crop-rotation"
							label={T()("media.crop.rotate.angle")}
							value={rotationDegrees()}
							min={-180}
							max={180}
							disabled={!isReady()}
							onChange={setRotation}
						/>
						<div>
							<div class="space-y-3">
								<DegreeRangeControl
									id="image-crop-skew-x"
									label={T()("media.crop.skew.x")}
									value={skewXDegrees()}
									min={-SKEW_LIMIT_DEGREES}
									max={SKEW_LIMIT_DEGREES}
									disabled={!isReady()}
									onChange={(degrees) => setSkew("x", degrees)}
								/>
								<DegreeRangeControl
									id="image-crop-skew-y"
									label={T()("media.crop.skew.y")}
									value={skewYDegrees()}
									min={-SKEW_LIMIT_DEGREES}
									max={SKEW_LIMIT_DEGREES}
									disabled={!isReady()}
									onChange={(degrees) => setSkew("y", degrees)}
								/>
							</div>
						</div>
						<Show when={clientError()}>
							{(error) => (
								<p
									class={classNames(
										"rounded-md border border-error-base/30 bg-error-base/10 p-3 text-sm text-error-base",
									)}
								>
									{error()}
								</p>
							)}
						</Show>
					</div>
				</div>
			</div>
			<ModalFooter>
				<div />
				<div class="flex items-center justify-end gap-2">
					<Button
						type="button"
						theme="border-outline"
						size="medium"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("common.cancel")}
					</Button>
					<Button
						type="button"
						theme="primary"
						size="medium"
						loading={isApplying()}
						disabled={!canApply()}
						onClick={() => {
							void applyCrop();
						}}
					>
						{T()("media.crop.apply")}
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default ImageCropEditor;
