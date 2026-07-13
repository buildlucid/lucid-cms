import type { ErrorResponse, Media, MediaCropState } from "@types";
import { type Accessor, createMemo, createSignal } from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import type { ImageMeta } from "@/utils/media-meta";
import { uploadMediaFile } from "@/utils/upload-session";

export const useUpdateMedia = (id: Accessor<number | undefined>) => {
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
	const [getPosterId, setPosterId] = createSignal<number | null | undefined>(
		undefined,
	);
	const [getFocalPoint, setFocalPoint] = createSignal<
		Media["meta"]["focalPoint"] | undefined
	>(undefined);
	const [getUploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [getUploadLoading, setUploadLoading] = createSignal<boolean>(false);
	const [getUploadProgress, setUploadProgress] = createSignal<number>(0);

	// -------------------------
	// Mutations
	const updateSingle = api.media.useUpdateSingle();
	const createUploadSession = api.media.useCreateUploadSession();

	// -------------------------
	// Functions
	const uploadFile = async (file: File, trackAsPrimary = true) => {
		try {
			setUploadLoading(true);
			setUploadProgress(0);
			const uploadRes = await uploadMediaFile({
				file,
				scope: `media:update:${id() ?? "unknown"}:${getPublic()}`,
				start: () =>
					createUploadSession.action.mutateAsync({
						body: {
							fileName: file.name,
							mimeType: file.type,
							size: file.size,
							public: getPublic(),
							temporary: true,
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
	const updateMedia = async (
		file: File | null,
		imageMeta: ImageMeta | null,
		options?: {
			origin?: Media["origin"];
			aiGenerationRequestId?: string;
			crop?: {
				file: File;
				state: MediaCropState;
				imageMeta: ImageMeta | null;
				focalPoint?: Media["meta"]["focalPoint"];
			} | null;
		},
	): Promise<boolean> => {
		if (!id()) return false;

		let fileKey = getKey();
		if (file) {
			const uploadFileRes = await uploadFile(file);
			if (!uploadFileRes) return false;
			fileKey = uploadFileRes;
		}
		const cropKey = options?.crop
			? await uploadFile(options.crop.file, false)
			: undefined;
		if (options?.crop && !cropKey) return false;

		await updateSingle.action.mutateAsync({
			id: id() as number,
			body: {
				key: fileKey,
				fileName: file?.name,
				title: getTitle(),
				alt: getAlt(),
				description: getDescription(),
				summary: getSummary(),
				origin: file ? (options?.origin ?? "human") : options?.origin,
				aiGenerationRequestId: options?.aiGenerationRequestId,
				folderId: getFolderId() ?? null,
				width: imageMeta?.width,
				height: imageMeta?.height,
				focalPoint: getFocalPoint(),
				blurHash: imageMeta?.blurHash,
				averageColor: imageMeta?.averageColor,
				base64: imageMeta?.base64,
				isDark: imageMeta?.isDark,
				isLight: imageMeta?.isLight,
				public: getPublic(),
				posterId: getPosterId(),
				crop:
					options?.crop === null
						? null
						: options?.crop && cropKey
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
			},
		});

		return true;
	};

	// -------------------------
	// Memos
	const isLoading = createMemo(() => {
		return (
			updateSingle.action.isPending ||
			createUploadSession.action.isPending ||
			getUploadLoading()
		);
	});
	const errors = createMemo(() => {
		return (
			updateSingle.errors() || createUploadSession.errors() || getUploadErrors()
		);
	});

	// -------------------------
	// Return
	return {
		updateMedia,
		setTitle,
		setAlt,
		setDescription,
		setSummary,
		setFolderId,
		setPublic,
		setPosterId,
		setFocalPoint,
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
			posterId: getPosterId,
			focalPoint: getFocalPoint,
		},
		reset: () => {
			setTitle([]);
			setAlt([]);
			setDescription([]);
			setSummary([]);
			setKey(undefined);
			setFolderId(undefined);
			setPublic(true);
			setPosterId(undefined);
			setFocalPoint(undefined);
			setUploadErrors();
			setUploadProgress(0);
			updateSingle.reset();
		},
	};
};
