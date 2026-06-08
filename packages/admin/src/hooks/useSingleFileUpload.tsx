import type { ErrorResponse } from "@types";
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
	accept?: SingleFileUploadProps["accept"];
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
		) => void | Promise<void>;
	};
}

type FileProvenance = ImageCropProvenance;
type FileChangeType = "selected" | "cropped" | "generated";
type FileSnapshot = {
	file: File | null;
	removedCurrent: boolean;
	focalPoint: FocalPoint | null;
	provenance?: FileProvenance;
	changeType?: FileChangeType;
};

const useSingleFileUpload = (data: UseSingleFileUploadProps) => {
	// ----------------------------------------
	// State
	const [getFile, setGetFile] = createSignal<File | null>(null);
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
	const [getFileChangeType, setFileChangeType] = createSignal<FileChangeType>();
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
			setFileChangeType("generated");
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

		const url = currentFile.cropUrl ?? currentFile.url;
		if (!url) return null;

		return {
			url,
			name: currentFile.name ?? "image",
			mimeType: currentFile.mimeType,
			provenance: {
				origin: currentFile.origin ?? "human",
			},
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
			},
			callbacks: {
				open: () => {
					setCropEditorSource(source);
					setCropEditorOpen(true);
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
			setGetRemovedCurrent(previousCropState.removedCurrent);
			setFocalPoint(previousCropState.focalPoint);
			setFileProvenance(previousCropState.provenance);
			setFileChangeType(previousCropState.changeType);
			return;
		}

		setGetFile(null);
		setGetRemovedCurrent(false);
		setFocalPoint(getCurrentFile()?.focalPoint ?? null);
		setFileProvenance(undefined);
		setFileChangeType(undefined);
	};
	const pendingChange = createMemo<SingleFileUploadProps["pendingChange"]>(
		() => {
			if (!getFile()) return undefined;

			return {
				label: T()(`media.file.pending.${getFileChangeType() ?? "selected"}`),
				reset: resetPendingChange,
			};
		},
	);

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
	const setFile = (file: File | null) => {
		setGetFile(file);
		setFileProvenance(undefined);
		setFileChangeType(file ? "selected" : undefined);
		setCropHistory([]);
	};
	const setGeneratedFile = async (
		file: File,
		provenance?: MediaImageGenerationFileMeta,
	) => {
		setGetFile(file);
		setGetRemovedCurrent(false);
		setFocalPoint(null);
		setFileProvenance(provenance);
		setFileChangeType("generated");
		setCropHistory([]);
		await data.imageGeneration?.onSetFile?.(file, provenance);
	};
	const applyCrop = async (file: File, provenance: ImageCropProvenance) => {
		setCropHistory((history) => [
			...history,
			{
				file: getFile(),
				removedCurrent: getRemovedCurrent(),
				focalPoint: getFocalPoint(),
				provenance: getFileProvenance(),
				changeType: getFileChangeType(),
			},
		]);
		setGetFile(file);
		setGetRemovedCurrent(false);
		setFocalPoint(null);
		setFileProvenance(provenance);
		setFileChangeType("cropped");
		await data.imageCrop?.onSetFile?.(file, provenance);
		return undefined;
	};

	// ----------------------------------------
	// Render
	return {
		getFile,
		setGetFile: setFile,
		setGeneratedFile,
		setCroppedFile: applyCrop,
		getFileProvenance,
		setFileProvenance,
		getRemovedCurrent,
		setGetRemovedCurrent,
		getCurrentFile,
		setCurrentFile: (file: SingleFileUploadProps["currentFile"]) => {
			setCurrentFile(file);
			setFocalPoint(file?.focalPoint ?? null);
			setFileProvenance(undefined);
			setFileChangeType(undefined);
			setCropHistory([]);
		},
		getFocalPoint,
		setFocalPoint,
		getMimeType,
		getFileName,
		getImageMeta,
		reset: () => {
			setGetFile(null);
			setFileProvenance(undefined);
			setFileChangeType(undefined);
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
						value: getFile(),
						setValue: (file) => {
							setGetFile(file);
							setFileProvenance(undefined);
							setFileChangeType(file ? "selected" : undefined);
							setCropHistory([]);
							if (file) setFocalPoint(null);
						},
						removedCurrent: getRemovedCurrent(),
						setRemovedCurrent: (removed) => {
							setGetRemovedCurrent(removed);
							if (removed) {
								setFocalPoint(null);
								setFileProvenance(undefined);
								setFileChangeType(undefined);
								setCropHistory([]);
							}
						},
					}}
					currentFile={getCurrentFile()}
					focalPoint={{
						value: getFocalPoint(),
						setValue: setFocalPoint,
					}}
					disableRemoveCurrent={data.disableRemoveCurrent}
					id={data.id}
					name={data.name}
					copy={data.copy}
					accept={data.accept}
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
