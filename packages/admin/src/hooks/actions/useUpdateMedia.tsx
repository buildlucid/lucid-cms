import T from "@/translations";
import { type Accessor, createMemo, createSignal } from "solid-js";
import api from "@/services/api";
import type { ErrorResponse, MediaResponse } from "@lucidcms/core/types";

export const useUpdateMedia = (id: Accessor<number | undefined>) => {
	const [getTitle, setTitle] = createSignal<MediaResponse["title"]>([]);
	const [getAlt, setAlt] = createSignal<MediaResponse["alt"]>([]);
	const [getKey, setKey] = createSignal<string>();
	const [getPresignedUrlValue, setPresignedUrlValue] = createSignal<string>();
	const [getUploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [getUploadLoading, setUploadLoading] = createSignal<boolean>(false);

	// -------------------------
	// Mutations
	const updateSingle = api.media.useUpdateSingle();
	const getPresignedUrl = api.media.useGetPresignedUrl({
		onSuccess: (data) => {
			setKey(data.data.key);
			setPresignedUrlValue(data.data.url);
		},
	});

	// -------------------------
	// Functions
	const getMediaPresignedUrl = async (fileName: string, mimeType: string) => {
		await getPresignedUrl.action.mutateAsync({
			body: { fileName, mimeType },
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
					"Content-Type": file.type,
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
	const updateMedia = async (file: File | null): Promise<boolean> => {
		if (!id()) return false;

		let fileKey = getKey();
		if (file) {
			await getMediaPresignedUrl(file.name, file.type);
			const uploadFileRes = await uploadFile(file);
			if (!uploadFileRes) return false;
			fileKey = uploadFileRes;
		}

		await updateSingle.action.mutateAsync({
			id: id() as number,
			body: {
				key: fileKey,
				fileName: file?.name,
				title: getTitle(),
				alt: getAlt(),
			},
		});

		return true;
	};

	// -------------------------
	// Memos
	const isLoading = createMemo(() => {
		return (
			updateSingle.action.isPending ||
			getPresignedUrl.action.isPending ||
			getUploadLoading()
		);
	});
	const errors = createMemo(() => {
		return (
			updateSingle.errors() || getPresignedUrl.errors() || getUploadErrors()
		);
	});

	// -------------------------
	// Return
	return {
		updateMedia,
		setTitle,
		setAlt,
		errors: errors,
		isLoading: isLoading,
		state: {
			title: getTitle,
			alt: getAlt,
			key: getKey,
		},
		reset: () => {
			setTitle([]);
			setAlt([]);
			setKey(undefined);
			setPresignedUrlValue(undefined);
			setUploadErrors();
			updateSingle.reset();
		},
	};
};
