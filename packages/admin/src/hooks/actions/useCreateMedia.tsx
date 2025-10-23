import type { ErrorResponse, MediaResponse } from "@types";
import { createMemo, createSignal } from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import type { ImageMeta } from "../useSingleFileUpload";

export const useCreateMedia = () => {
	const [getTitle, setTitle] = createSignal<MediaResponse["title"]>([]);
	const [getAlt, setAlt] = createSignal<MediaResponse["alt"]>([]);
	const [getKey, setKey] = createSignal<string>();
	const [getFolderId, setFolderId] = createSignal<number | null | undefined>(
		undefined,
	);
	const [getPublic, setPublic] = createSignal<boolean>(true);
	const [getPresignedUrlValue, setPresignedUrlValue] = createSignal<string>();
	const [getPresignedUrlHeaders, setPresignedUrlHeaders] =
		createSignal<Record<string, string>>();
	const [getUploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [getUploadLoading, setUploadLoading] = createSignal<boolean>(false);

	// -------------------------
	// Mutations
	const createSingle = api.media.useCreateSingle();
	const getPresignedUrl = api.media.useGetPresignedUrl({
		onSuccess: (data) => {
			setKey(data.data.key);
			setPresignedUrlValue(data.data.url);
			setPresignedUrlHeaders(data.data.headers);
		},
	});

	// -------------------------
	// Functions
	const getMediaPresignedUrl = async (fileName: string, mimeType: string) => {
		await getPresignedUrl.action.mutateAsync({
			body: { fileName, mimeType, public: getPublic() },
		});
	};
	const uploadFile = async (file: File) => {
		try {
			setUploadLoading(true);
			const key = getKey();
			const presignedUrl = getPresignedUrlValue();

			if (!key || !presignedUrl) {
				setUploadErrors({
					status: 400,
					name: T()("media_upload_error"),
					message: T()("media_no_key_or_presigned_url"),
				});
				return null;
			}
			const response = await fetch(presignedUrl, {
				method: "PUT",
				body: file,
				headers: {
					"content-type": file.type,
					...getPresignedUrlHeaders(),
				},
			});

			let bodyMessage = "";
			if (response.headers.get("content-type")?.includes("application/json")) {
				const body = await response.json();
				bodyMessage = body?.message || "";
			}

			if (!response.ok) {
				setUploadErrors({
					status: response.status,
					name: T()("media_upload_error"),
					message: T()("media_upload_error_description"),
					errors: {
						body: {
							file: {
								message: bodyMessage || "",
							},
						},
					},
				});
				return null;
			}

			return key;
		} catch (error) {
			setUploadErrors({
				status: 500,
				name: T()("media_upload_error"),
				message:
					error instanceof Error
						? error.message
						: T()("media_upload_error_description"),
			});
			return null;
		} finally {
			setUploadLoading(false);
		}
	};
	const createMedia = async (
		file: File | null,
		imageMeta: ImageMeta | null,
	): Promise<boolean> => {
		let fileKey = getKey();

		if (file) {
			await getMediaPresignedUrl(file.name, file.type);
			const uploadFileRes = await uploadFile(file);
			if (!uploadFileRes) return false;
			fileKey = uploadFileRes;
		}

		await createSingle.action.mutateAsync({
			key: fileKey,
			fileName: file?.name,
			title: getTitle(),
			alt: getAlt(),
			folderId: getFolderId() ?? null,
			width: imageMeta?.width,
			height: imageMeta?.height,
			blurHash: imageMeta?.blurHash,
			averageColor: imageMeta?.averageColor,
			isDark: imageMeta?.isDark,
			isLight: imageMeta?.isLight,
		});

		return true;
	};

	// -------------------------
	// Memos
	const isLoading = createMemo(() => {
		return (
			createSingle.action.isPending ||
			getPresignedUrl.action.isPending ||
			getUploadLoading()
		);
	});
	const errors = createMemo(() => {
		return (
			createSingle.errors() || getPresignedUrl.errors() || getUploadErrors()
		);
	});

	// -------------------------
	// Return
	return {
		createMedia,
		setTitle,
		setAlt,
		setFolderId,
		setPublic,
		errors: errors,
		isLoading: isLoading,
		state: {
			title: getTitle,
			alt: getAlt,
			key: getKey,
			folderId: getFolderId,
			public: getPublic,
		},
		reset: () => {
			setTitle([]);
			setAlt([]);
			setKey(undefined);
			setFolderId(undefined);
			setPresignedUrlValue(undefined);
			setPublic(true);
			setUploadErrors();
			createSingle.reset();
		},
	};
};
