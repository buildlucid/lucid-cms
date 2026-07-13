import type {
	ErrorResponse,
	Media,
	MediaCropState,
	MediaImageMeta,
	MediaTranslation,
} from "@types";
import { createMemo, createSignal } from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import type { ImageMeta } from "@/utils/media-meta";
import { uploadMediaFile } from "@/utils/upload-session";

export const useCreateMedia = () => {
	const [getTitle, setTitle] = createSignal<Media["title"]>([]);
	const [getAlt, setAlt] = createSignal<MediaTranslation[]>([]);
	const [getDescription, setDescription] = createSignal<MediaTranslation[]>([]);
	const [getSummary, setSummary] = createSignal<MediaTranslation[]>([]);
	const [getKey, setKey] = createSignal<string>();
	const [getFolderId, setFolderId] = createSignal<number | null | undefined>(
		undefined,
	);
	const [getPublic, setPublic] = createSignal<boolean>(true);
	const [getUploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [getUploadLoading, setUploadLoading] = createSignal<boolean>(false);
	const [getUploadProgress, setUploadProgress] = createSignal<number>(0);

	// -------------------------
	// Mutations
	const createSingle = api.media.useCreateSingle();
	const createUploadSession = api.media.useCreateUploadSession();

	// -------------------------
	// Functions
	const uploadFile = async (
		file: File,
		publicValue: boolean,
		trackAsPrimary = true,
	) => {
		try {
			setUploadLoading(true);
			setUploadProgress(0);
			const uploadRes = await uploadMediaFile({
				file,
				scope: `media:create:${publicValue}`,
				start: () =>
					createUploadSession.action.mutateAsync({
						body: {
							fileName: file.name,
							mimeType: file.type,
							size: file.size,
							public: publicValue,
						},
					}),
				onProgress: setUploadProgress,
			});
			if (uploadRes.error) {
				setUploadErrors(uploadRes.error);
				return null;
			}
			if (trackAsPrimary) setKey(uploadRes.data);
			return uploadRes.data;
		} catch (error) {
			setUploadErrors({
				status: 500,
				name: T()("media.upload.error.title"),
				message:
					error instanceof Error
						? error.message
						: T()("media.upload.error.description"),
			});
			return null;
		} finally {
			setUploadLoading(false);
		}
	};
	const createMedia = async (
		file: File | null,
		imageMeta: ImageMeta | null,
		options?: {
			title?: Media["title"];
			alt?: MediaTranslation[];
			description?: MediaTranslation[];
			summary?: MediaTranslation[];
			folderId?: number | null;
			public?: boolean;
			isHidden?: boolean;
			posterId?: number | null;
			focalPoint?: MediaImageMeta["focalPoint"];
			origin?: Media["origin"];
			aiGenerationRequestId?: string;
			crop?: {
				file: File;
				state: MediaCropState;
				imageMeta: ImageMeta | null;
				focalPoint?: MediaImageMeta["focalPoint"];
			};
		},
	): Promise<Media | null> => {
		let fileKey = getKey();

		if (file) {
			const uploadFileRes = await uploadFile(
				file,
				options?.public ?? getPublic(),
			);
			if (!uploadFileRes) return null;
			fileKey = uploadFileRes;
		}
		const cropKey = options?.crop
			? await uploadFile(
					options.crop.file,
					options?.public ?? getPublic(),
					false,
				)
			: undefined;
		if (options?.crop && !cropKey) return null;
		const mediaType = helpers.getMediaType(file?.type);

		const result = await createSingle.action.mutateAsync({
			key: fileKey,
			fileName: file?.name,
			title: options?.title ?? getTitle(),
			alt: mediaType === "image" ? (options?.alt ?? getAlt()) : undefined,
			description:
				mediaType === "video" || mediaType === "audio"
					? (options?.description ?? getDescription())
					: undefined,
			summary:
				mediaType === "document"
					? (options?.summary ?? getSummary())
					: undefined,
			origin: options?.origin ?? "human",
			aiGenerationRequestId: options?.aiGenerationRequestId,
			folderId: options?.folderId ?? getFolderId() ?? null,
			posterId: mediaType === "video" ? options?.posterId : undefined,
			isHidden: options?.isHidden,
			width: mediaType === "image" ? imageMeta?.width : undefined,
			height: mediaType === "image" ? imageMeta?.height : undefined,
			focalPoint:
				mediaType === "image" ? (options?.focalPoint ?? undefined) : undefined,
			blurHash: mediaType === "image" ? imageMeta?.blurHash : undefined,
			averageColor: mediaType === "image" ? imageMeta?.averageColor : undefined,
			base64: mediaType === "image" ? imageMeta?.base64 : undefined,
			isDark: mediaType === "image" ? imageMeta?.isDark : undefined,
			isLight: mediaType === "image" ? imageMeta?.isLight : undefined,
			crop:
				mediaType === "image" && options?.crop && cropKey
					? {
							key: cropKey,
							fileName: options.crop.file.name,
							width: options.crop.imageMeta?.width ?? 1,
							height: options.crop.imageMeta?.height ?? 1,
							focalPoint: options.crop.focalPoint,
							blurHash: options.crop.imageMeta?.blurHash,
							averageColor: options.crop.imageMeta?.averageColor,
							base64: options.crop.imageMeta?.base64,
							isDark: options.crop.imageMeta?.isDark,
							isLight: options.crop.imageMeta?.isLight,
							state: options.crop.state,
						}
					: undefined,
		});

		return result.data;
	};

	// -------------------------
	// Memos
	const isLoading = createMemo(() => {
		return (
			createSingle.action.isPending ||
			createUploadSession.action.isPending ||
			getUploadLoading()
		);
	});
	const errors = createMemo(() => {
		return (
			createSingle.errors() || createUploadSession.errors() || getUploadErrors()
		);
	});

	// -------------------------
	// Return
	return {
		createMedia,
		setTitle,
		setAlt,
		setDescription,
		setSummary,
		setFolderId,
		setPublic,
		errors: errors,
		isLoading: isLoading,
		uploadProgress: getUploadProgress,
		state: {
			title: getTitle,
			alt: getAlt,
			description: getDescription,
			summary: getSummary,
			key: getKey,
			folderId: getFolderId,
			public: getPublic,
			posterId: () => undefined,
		},
		reset: () => {
			setTitle([]);
			setAlt([]);
			setDescription([]);
			setSummary([]);
			setKey(undefined);
			setFolderId(undefined);
			setPublic(true);
			setUploadErrors();
			setUploadProgress(0);
			createSingle.reset();
		},
	};
};
