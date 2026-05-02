import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
} from "solid-js";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import T from "@/translations";

export interface FocalPoint {
	x: number;
	y: number;
}

const CENTER_FOCAL_POINT: FocalPoint = { x: 0.5, y: 0.5 };

const clamp = (value: number) => Math.min(1, Math.max(0, value));

interface FocalSurfaceSize {
	width: number;
	height: number;
}

const FocalPointEditor: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	src: string;
	alt: string;
	dimensions?: {
		width: number | null | undefined;
		height: number | null | undefined;
	};
	value: FocalPoint | null;
	onSave: (_value: FocalPoint) => void;
}> = (props) => {
	// ------------------------------
	// State
	const [draft, setDraft] = createSignal<FocalPoint>(CENTER_FOCAL_POINT);
	const [focalSurfaceSize, setFocalSurfaceSize] =
		createSignal<FocalSurfaceSize>({
			width: 0,
			height: 0,
		});

	// ------------------------------
	// Refs
	let stageRef: HTMLDivElement | undefined;
	let imageRef: HTMLImageElement | undefined;
	let focalSurfaceRef: HTMLDivElement | undefined;

	// ------------------------------
	// Memos
	const focalSurfaceStyle = createMemo(() => {
		const size = focalSurfaceSize();

		return {
			width: `${size.width}px`,
			height: `${size.height}px`,
		};
	});

	const pinStyle = createMemo(() => ({
		left: `${draft().x * 100}%`,
		top: `${draft().y * 100}%`,
	}));

	// ------------------------------
	// Functions
	function getImageRatio() {
		const propWidth = props.dimensions?.width;
		const propHeight = props.dimensions?.height;

		if (propWidth && propHeight) return propWidth / propHeight;
		if (imageRef?.naturalWidth && imageRef.naturalHeight) {
			return imageRef.naturalWidth / imageRef.naturalHeight;
		}

		return null;
	}

	function updateFocalSurfaceSize() {
		if (!stageRef) return;

		const stageRect = stageRef.getBoundingClientRect();
		const ratio = getImageRatio();

		if (
			stageRect.width === 0 ||
			stageRect.height === 0 ||
			ratio === null ||
			ratio === 0
		) {
			setFocalSurfaceSize({
				width: stageRect.width,
				height: stageRect.height,
			});
			return;
		}

		const stageRatio = stageRect.width / stageRect.height;
		const width =
			ratio > stageRatio ? stageRect.width : stageRect.height * ratio;
		const height =
			ratio > stageRatio ? stageRect.width / ratio : stageRect.height;

		setFocalSurfaceSize({
			width,
			height,
		});
	}

	function updateFromClientPoint(clientX: number, clientY: number) {
		const rect = focalSurfaceRef?.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) return;

		setDraft({
			x: clamp((clientX - rect.left) / rect.width),
			y: clamp((clientY - rect.top) / rect.height),
		});
	}

	function startDrag(event: PointerEvent) {
		event.preventDefault();
		updateFromClientPoint(event.clientX, event.clientY);
		focalSurfaceRef?.setPointerCapture(event.pointerId);
	}

	function moveDrag(event: PointerEvent) {
		if (!focalSurfaceRef?.hasPointerCapture(event.pointerId)) return;
		updateFromClientPoint(event.clientX, event.clientY);
	}

	function endDrag(event: PointerEvent) {
		if (focalSurfaceRef?.hasPointerCapture(event.pointerId)) {
			focalSurfaceRef.releasePointerCapture(event.pointerId);
		}
	}

	// ------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open) {
			setDraft(props.value ?? CENTER_FOCAL_POINT);
			requestAnimationFrame(updateFocalSurfaceSize);
		}
	});

	createEffect(() => {
		if (!props.state.open || !stageRef) return;

		const observer = new ResizeObserver(updateFocalSurfaceSize);
		observer.observe(stageRef);
		window.addEventListener("resize", updateFocalSurfaceSize);

		onCleanup(() => {
			observer.disconnect();
			window.removeEventListener("resize", updateFocalSurfaceSize);
		});
	});

	// ------------------------------
	// Render
	return (
		<Modal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			options={{
				noPadding: true,
			}}
		>
			<div class="space-y-4 p-4 md:p-6">
				<div>
					<h2 class="text-title text-base font-semibold">
						{T()("focal_point")}
					</h2>
					<p class="text-body text-base mt-1">
						{T()("focal_point_description")}
					</p>
				</div>
				<div
					ref={stageRef}
					class="relative flex h-[52vh] max-h-130 min-h-70 w-full items-center justify-center overflow-hidden rounded-md border border-border rectangle-background touch-none"
				>
					<div
						ref={focalSurfaceRef}
						class="relative z-20 touch-none"
						style={focalSurfaceStyle()}
						onPointerDown={startDrag}
						onPointerMove={moveDrag}
						onPointerUp={endDrag}
						onPointerCancel={endDrag}
					>
						<img
							ref={imageRef}
							src={props.src}
							alt={props.alt}
							class="absolute inset-0 z-10 block h-full w-full select-none"
							draggable={false}
							onLoad={updateFocalSurfaceSize}
						/>
						<div
							class={classNames(
								"pointer-events-none absolute z-20 h-px w-full -translate-y-1/2",
								"bg-secondary-base/45",
							)}
							style={{ top: pinStyle().top }}
						/>
						<div
							class={classNames(
								"pointer-events-none absolute z-20 h-full w-px -translate-x-1/2",
								"bg-secondary-base/45",
							)}
							style={{ left: pinStyle().left }}
						/>
						<div
							class={classNames(
								"pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full",
								"flex h-10 w-10 items-center justify-center border-2 border-white bg-black/45 shadow-[0_0_0_2px_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.35)]",
							)}
							style={pinStyle()}
						>
							<div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm">
								<div class="h-2.5 w-2.5 rounded-full bg-white" />
							</div>
						</div>
					</div>
				</div>
			</div>
			<ModalFooter>
				<Button
					type="button"
					theme="danger-subtle"
					size="medium"
					classes="self-start"
					onClick={() => setDraft(CENTER_FOCAL_POINT)}
				>
					{T()("reset")}
				</Button>
				<div class="flex items-center justify-end gap-2">
					<Button
						type="button"
						theme="border-outline"
						size="medium"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("cancel")}
					</Button>
					<Button
						type="button"
						theme="primary"
						size="medium"
						onClick={() => {
							props.onSave(draft());
							props.state.setOpen(false);
						}}
					>
						{T()("save")}
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default FocalPointEditor;
