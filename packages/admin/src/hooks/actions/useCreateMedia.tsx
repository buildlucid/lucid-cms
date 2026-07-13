import type { ErrorResponse, Media, MediaCropState } from "@types";
import { createMemo, createSignal } from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import type { ImageMeta } from "@/utils/media-meta";
import { uploadMediaFile } from "@/utils/upload-session";

export const useCreateMedia = () => {
	const [getTitle, setTitle] = createSignal<Media["title"]>([]);
	const [getAlt, setAlt] = createSignal<Media["alt"]>([]);
	const [getDescription, setDescription] = createSignal<
		NonNullable<Media["description"]>
	>([]);
	const [getSummary, setSummary] = createSignal<NonNullable<Media["summary"]>>(
		[],
	);
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
			alt?: Media["alt"];
			description?: NonNullable<Media["description"]>;
			summary?: NonNullable<Media["summary"]>;
			folderId?: number | null;
			public?: boolean;
			isHidden?: boolean;
			posterId?: number | null;
			focalPoint?: Media["meta"]["focalPoint"];
			origin?: Media["origin"];
			aiGenerationRequestId?: string;
			crop?: {
				file: File;
				state: MediaCropState;
				imageMeta: ImageMeta | null;
				focalPoint?: Media["meta"]["focalPoint"];
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

		const result = await createSingle.action.mutateAsync({
			key: fileKey,
			fileName: file?.name,
			title: options?.title ?? getTitle(),
			alt: options?.alt ?? getAlt(),
			description: options?.description ?? getDescription(),
			summary: options?.summary ?? getSummary(),
			origin: options?.origin ?? "human",
			aiGenerationRequestId: options?.aiGenerationRequestId,
			folderId: options?.folderId ?? getFolderId() ?? null,
			posterId: options?.posterId,
			isHidden: options?.isHidden,
			width: imageMeta?.width,
			height: imageMeta?.height,
			focalPoint: options?.focalPoint ?? undefined,
			blurHash: imageMeta?.blurHash,
			averageColor: imageMeta?.averageColor,
			base64: imageMeta?.base64,
			isDark: imageMeta?.isDark,
			isLight: imageMeta?.isLight,
			crop:
				options?.crop && cropKey
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
