import type { ErrorResponse, MediaCropState } from "@types";
import { type Accessor, createMemo, createSignal } from "solid-js";
import { SingleFileUpload } from "@/components/Groups/Form";
import type {
	SingleFileUploadImageCrop,
	SingleFileUploadImageGeneration,
	SingleFileUploadProps,
} from "@/components/Groups/Form/SingleFileUpload";
import type { FocalPoint } from "@/components/Modals/Media/FocalPointEditor";
import ImageCropEditor from "@/components/Modals/Media/ImageCropEditor";
import useMediaImageGeneration from "@/hooks/ai/useMediaImageGeneration";
import type {
	AiImageSource,
	MediaImageGenerationFileMeta,
	MediaImageGenerationTarget,
} from "@/store/aiModalsStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import {
	type ImageCropProvenance,
	type ImageCropSource,
	isSupportedCropMimeType,
} from "@/utils/image-crop";
import {
	getImageMeta as getFileImageMeta,
	type ImageMeta,
} from "@/utils/media-meta";

interface UseSingleFileUploadProps {
	id: SingleFileUploadProps["id"];
	currentFile?: SingleFileUploadProps["currentFile"];
	disableRemoveCurrent?: SingleFileUploadProps["disableRemoveCurrent"];
	name: SingleFileUploadProps["name"];
	copy?: SingleFileUploadProps["copy"];
	accept?:
		| SingleFileUploadProps["accept"]
		| Accessor<SingleFileUploadProps["accept"]>;
	required?: SingleFileUploadProps["required"];
	disabled?: SingleFileUploadProps["disabled"];
	progress?: Accessor<SingleFileUploadProps["progress"]>;
	errors?: Accessor<ErrorResponse | undefined>;
	noMargin?: SingleFileUploadProps["noMargin"];
	imageGeneration?: {
		enabled?: Accessor<boolean>;
		disabled?: Accessor<boolean>;
		onSetFile?: (
			_file: File,
			_meta?: MediaImageGenerationFileMeta,
		) => void | Promise<void>;
	};
	imageCrop?: {
		enabled?: Accessor<boolean>;
		disabled?: Accessor<boolean>;
		onSetFile?: (
			_file: File,
			_provenance: ImageCropProvenance,
			_state: MediaCropState,
		) => void | Promise<void>;
	};
}

type FileProvenance = ImageCropProvenance;
type FileSnapshot = {
	file: File | null;
	cropFile: File | null;
	cropState?: MediaCropState;
	cropRemoved: boolean;
	removedCurrent: boolean;
	focalPoint: FocalPoint | null;
	provenance?: FileProvenance;
};

const useSingleFileUpload = (data: UseSingleFileUploadProps) => {
	// ----------------------------------------
	// State
	const [getFile, setGetFile] = createSignal<File | null>(null);
	const [getCropFile, setCropFile] = createSignal<File | null>(null);
	const [getCropState, setCropState] = createSignal<MediaCropState | undefined>(
		data.currentFile?.crop,
	);
	const [getCropRemoved, setCropRemoved] = createSignal(false);
	const [getRemovedCurrent, setGetRemovedCurrent] =
		createSignal<boolean>(false);
	const [getCurrentFile, setCurrentFile] = createSignal<
		SingleFileUploadProps["currentFile"]
	>(data.currentFile);
	const [getFocalPoint, setFocalPoint] = createSignal<FocalPoint | null>(
		data.currentFile?.focalPoint ?? null,
	);
	const [getFileProvenance, setFileProvenance] = createSignal<
		FileProvenance | undefined
	>();
	const [getCropHistory, setCropHistory] = createSignal<FileSnapshot[]>([]);
	const [cropEditorOpen, setCropEditorOpen] = createSignal(false);
	const [cropEditorSource, setCropEditorSource] =
		createSignal<ImageCropSource | null>(null);
	const mediaImageGeneration = useMediaImageGeneration();
	const imageGenerationTargetId = mediaImageGeneration.getTargetId();

	// ----------------------------------------
	// Functions
	const imageGenerationSource = (): AiImageSource | null => {
		const file = getFile();
		if (file && helpers.getMediaType(file.type) === "image") {
			return {
				file,
				filename: file.name,
			};
		}

		const currentFile = getCurrentFile();
		if (
			getRemovedCurrent() !== true &&
			currentFile?.type === "image" &&
			(currentFile.focalPointUrl || currentFile.url)
		) {
			return {
				url: currentFile.focalPointUrl ?? currentFile.url,
				filename: currentFile.name,
			};
		}

		return null;
	};

	// ----------------------------------------
	// Functions
	const imageGenerationEnabled = () => {
		return (
			mediaImageGeneration.isFeatureEnabled() &&
			data.imageGeneration !== undefined &&
			(data.imageGeneration.enabled?.() ?? true)
		);
	};
	const imageGenerationTarget: MediaImageGenerationTarget = {
		image: () => imageGenerationSource(),
		setFile: async (file, meta) => {
			setGetFile(file);
			setGetRemovedCurrent(false);
			setFocalPoint(null);
			setFileProvenance(meta);
			setCropHistory([]);
			await data.imageGeneration?.onSetFile?.(file, meta);
		},
		disabled: () =>
			data.disabled === true || data.imageGeneration?.disabled?.() === true,
	};
	const imageGeneration = (): SingleFileUploadImageGeneration | undefined => {
		if (!imageGenerationEnabled()) return undefined;

		return {
			state: {
				loading: mediaImageGeneration.isTargetLoading(imageGenerationTargetId),
				disabled: mediaImageGeneration.isDisabled(imageGenerationTarget),
				disabledClickable: mediaImageGeneration.accessState().disabled,
				tooltip: mediaImageGeneration.getTooltip(imageGenerationTarget),
			},
			callbacks: {
				open: () =>
					mediaImageGeneration.open(
						imageGenerationTarget,
						imageGenerationTargetId,
					),
			},
		};
	};

	const imageCropSource = createMemo<ImageCropSource | null>(() => {
		const file = getFile();
		if (file) {
			if (
				helpers.getMediaType(file.type) !== "image" ||
				!isSupportedCropMimeType(file.type)
			) {
				return null;
			}

			return {
				file,
				name: file.name,
				mimeType: file.type,
				provenance: getFileProvenance() ?? { origin: "human" },
				crop: getCropState(),
			};
		}

		const currentFile = getCurrentFile();
		if (
			getRemovedCurrent() === true ||
			currentFile?.type !== "image" ||
			!isSupportedCropMimeType(currentFile.mimeType)
		) {
			return null;
		}

		const url = currentFile.originalUrl ?? currentFile.url;
		if (!url) return null;

		return {
			url,
			name: currentFile.name ?? "image",
			mimeType: currentFile.mimeType,
			provenance: {
				origin: currentFile.origin ?? "human",
			},
			crop: getCropRemoved() ? undefined : getCropState(),
		};
	});
	const imageCropEnabled = () => {
		return data.imageCrop !== undefined && (data.imageCrop.enabled?.() ?? true);
	};
	const imageCrop = (): SingleFileUploadImageCrop | undefined => {
		if (!imageCropEnabled()) return undefined;

		const source = imageCropSource();
		if (!source) return undefined;

		return {
			state: {
				disabled:
					data.disabled === true || data.imageCrop?.disabled?.() === true,
				tooltip: T()("media.crop.action"),
				hasCrop:
					getCropFile() !== null ||
					(getFile() === null &&
						!getCropRemoved() &&
						getCurrentFile()?.crop !== undefined),
			},
			callbacks: {
				open: () => {
					setCropEditorSource(source);
					setCropEditorOpen(true);
				},
				remove: () => {
					setCropFile(null);
					setCropState(undefined);
					setCropRemoved(true);
					setFocalPoint(getCurrentFile()?.originalFocalPoint ?? null);
				},
			},
		};
	};
	const resetPendingChange = () => {
		const cropHistory = getCropHistory();
		const previousCropState = cropHistory[cropHistory.length - 1];
		if (previousCropState) {
			setCropHistory(cropHistory.slice(0, -1));
			setGetFile(previousCropState.file);
			setCropFile(previousCropState.cropFile);
			setCropState(previousCropState.cropState);
			setCropRemoved(previousCropState.cropRemoved);
			setGetRemovedCurrent(previousCropState.removedCurrent);
			setFocalPoint(previousCropState.focalPoint);
			setFileProvenance(previousCropState.provenance);
			return;
		}

		setGetFile(null);
		setCropFile(null);
		setCropState(getCurrentFile()?.crop);
		setCropRemoved(false);
		setGetRemovedCurrent(false);
		setFocalPoint(getCurrentFile()?.focalPoint ?? null);
		setFileProvenance(undefined);
	};
	const pendingChange = createMemo<SingleFileUploadProps["pendingChange"]>(
		() => {
			if (!getFile() && !getCropFile() && !getCropRemoved()) return undefined;

			return {
				reset: resetPendingChange,
			};
		},
	);
	const previewCurrentFile = createMemo(() => {
		const currentFile = getCurrentFile();
		if (!currentFile || !getCropRemoved() || !currentFile.originalUrl) {
			return currentFile;
		}

		return {
			...currentFile,
			url: currentFile.originalPreviewUrl ?? currentFile.originalUrl,
			focalPointUrl:
				currentFile.originalFocalPointUrl ?? currentFile.originalUrl,
			focalPoint: currentFile.originalFocalPoint,
			crop: undefined,
		};
	});

	// ----------------------------------------
	const getMimeType = (): string | undefined => {
		return getFile()?.type;
	};
	const getFileName = (): string | undefined => {
		return getFile()?.name;
	};
	const getImageMeta = async (): Promise<ImageMeta | null> => {
		const file = getFile();
		if (!file) return null;
		return getFileImageMeta(file);
	};
	const getCropImageMeta = async (): Promise<ImageMeta | null> => {
		const file = getCropFile();
		if (!file) return null;
		return getFileImageMeta(file);
	};
	const setFile = (file: File | null) => {
		setGetFile(file);
		setCropFile(null);
		setCropState(undefined);
		setCropRemoved(false);
		setFileProvenance(undefined);
		setCropHistory([]);
	};
	const setGeneratedFile = async (
		file: File,
		provenance?: MediaImageGenerationFileMeta,
	) => {
		setGetFile(file);
		setCropFile(null);
		setCropState(undefined);
		setCropRemoved(false);
		setGetRemovedCurrent(false);
		setFocalPoint(null);
		setFileProvenance(provenance);
		setCropHistory([]);
		await data.imageGeneration?.onSetFile?.(file, provenance);
	};
	const applyCrop = async (
		file: File,
		provenance: ImageCropProvenance,
		state: MediaCropState,
	) => {
		setCropHistory((history) => [
			...history,
			{
				file: getFile(),
				cropFile: getCropFile(),
				cropState: getCropState(),
				cropRemoved: getCropRemoved(),
				removedCurrent: getRemovedCurrent(),
				focalPoint: getFocalPoint(),
				provenance: getFileProvenance(),
			},
		]);
		setCropFile(file);
		setCropState(state);
		setCropRemoved(false);
		setGetRemovedCurrent(false);
		setFocalPoint(null);
		await data.imageCrop?.onSetFile?.(file, provenance, state);
		return undefined;
	};

	// ----------------------------------------
	// Render
	return {
		getFile,
		setGetFile: setFile,
		setGeneratedFile,
		setCroppedFile: applyCrop,
		getCropFile,
		getCropState,
		getCropRemoved,
		removeCrop: () => {
			setCropFile(null);
			setCropState(undefined);
			setCropRemoved(true);
			setFocalPoint(getCurrentFile()?.originalFocalPoint ?? null);
		},
		getFileProvenance,
		setFileProvenance,
		getRemovedCurrent,
		setGetRemovedCurrent,
		getCurrentFile,
		setCurrentFile: (file: SingleFileUploadProps["currentFile"]) => {
			setCurrentFile(file);
			setFocalPoint(file?.focalPoint ?? null);
			setCropFile(null);
			setCropState(file?.crop);
			setCropRemoved(false);
			setFileProvenance(undefined);
			setCropHistory([]);
		},
		getFocalPoint,
		setFocalPoint,
		getMimeType,
		getFileName,
		getImageMeta,
		getCropImageMeta,
		openImageGeneration: () => {
			imageGeneration()?.callbacks.open();
		},
		reset: () => {
			setGetFile(null);
			setCropFile(null);
			setCropState(data.currentFile?.crop);
			setCropRemoved(false);
			setFileProvenance(undefined);
			setCropHistory([]);
			setGetRemovedCurrent(false);
			setCurrentFile(data.currentFile);
			setFocalPoint(data.currentFile?.focalPoint ?? null);
			setCropEditorOpen(false);
			setCropEditorSource(null);
		},
		Render: () => (
			<>
				<ImageCropEditor
					state={{
						open: cropEditorOpen(),
						setOpen: setCropEditorOpen,
					}}
					source={cropEditorSource()}
					onApply={applyCrop}
				/>
				<SingleFileUpload
					state={{
						value: getCropFile() ?? getFile(),
						setValue: (file) => {
							setGetFile(file);
							setCropFile(null);
							setCropState(undefined);
							setCropRemoved(false);
							setFileProvenance(undefined);
							setCropHistory([]);
							if (file) setFocalPoint(null);
						},
						removedCurrent: getRemovedCurrent(),
						setRemovedCurrent: (removed) => {
							setGetRemovedCurrent(removed);
							if (removed) {
								setCropFile(null);
								setCropState(undefined);
								setCropRemoved(false);
								setFocalPoint(null);
								setFileProvenance(undefined);
								setCropHistory([]);
							}
						},
					}}
					currentFile={previewCurrentFile()}
					focalPoint={{
						value: getFocalPoint(),
						setValue: setFocalPoint,
					}}
					disableRemoveCurrent={data.disableRemoveCurrent}
					id={data.id}
					name={data.name}
					copy={data.copy}
					accept={
						typeof data.accept === "function" ? data.accept() : data.accept
					}
					required={data.required}
					disabled={data.disabled}
					progress={data.progress?.()}
					errors={
						data.errors ? getBodyError(data.name, data.errors) : undefined
					}
					noMargin={data.noMargin}
					imageGeneration={imageGeneration()}
					imageCrop={imageCrop()}
					pendingChange={pendingChange()}
				/>
			</>
		),
	};
};

export default useSingleFileUpload;
