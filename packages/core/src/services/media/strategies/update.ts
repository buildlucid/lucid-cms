import T from "../../../translations/index.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { MediaType } from "../../../types/response.js";
import { formatBytes } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices, optionServices } from "../../index.js";
import validateUploadedMedia from "../helpers/validate-uploaded-media.js";

const update: ServiceFn<
	[
		{
			fileName: string;
			previousEtag?: string | null;
			previousSize: number;
			previousKey: string;
			previousType: MediaType;
			updatedKey: string;
			targetKey: string;
			allowedType?: MediaType;
		},
	],
	{
		mimeType: string;
		type: MediaType;
		extension: string;
		size: number;
		key: string;
		etag: string | null;
		sourceDeleted: boolean;
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const cleanupUpdatedKey = async () => {
		await mediaStrategyRes.data.delete(data.updatedKey);
	};

	const revertStorageDelta = async (delta: number) => {
		if (delta === 0) return;

		await optionServices.adjustInt(context, {
			name: "media_storage_used",
			delta: delta * -1,
			min: 0,
		});
	};

	// Fetch meta data from new file
	const mediaMetaRes = await mediaStrategyRes.data.getMeta(data.updatedKey);
	if (mediaMetaRes.error) return mediaMetaRes;

	// Ensure we available storage space
	const proposedSizeRes = await mediaServices.checks.checkCanUpdateMedia(
		context,
		{
			size: mediaMetaRes.data.size,
		},
	);
	if (proposedSizeRes.error) {
		await cleanupUpdatedKey();
		return proposedSizeRes;
	}

	const fileMetaData = await validateUploadedMedia({
		stream: mediaStrategyRes.data.stream,
		key: data.updatedKey,
		fileName: data.fileName,
		mimeType: mediaMetaRes.data.mimeType,
		allowedType: data.allowedType,
		expectedType: data.previousType,
	});
	if (fileMetaData.error) {
		await cleanupUpdatedKey();
		return fileMetaData;
	}

	const delta = mediaMetaRes.data.size - data.previousSize;
	const storageLimit = context.config.media.limits.storage;
	const storageRes = await optionServices.adjustInt(context, {
		name: "media_storage_used",
		delta: delta,
		max: storageLimit === false ? undefined : storageLimit,
		min: 0,
	});
	if (storageRes.error) {
		await cleanupUpdatedKey();
		return storageRes;
	}
	if (!storageRes.data.applied) {
		await cleanupUpdatedKey();

		if (storageLimit === false) {
			return {
				error: {
					type: "basic",
					status: 500,
				},
				data: undefined,
			};
		}

		return {
			error: {
				type: "basic",
				message: T("file_exceeds_storage_limit_max_limit_is", {
					size: formatBytes(storageLimit),
				}),
				status: 500,
				errors: {
					file: {
						code: "storage",
						message: T("file_exceeds_storage_limit_max_limit_is", {
							size: formatBytes(storageLimit),
						}),
					},
				},
			},
			data: undefined,
		};
	}

	const getVerifiedTargetMeta = async (options?: {
		requireChangedEtag?: boolean;
	}) => {
		const targetMetaRes = await mediaStrategyRes.data.getMeta(data.targetKey);
		if (targetMetaRes.error) return null;

		const matchesTarget =
			targetMetaRes.data.size === mediaMetaRes.data.size &&
			targetMetaRes.data.mimeType === fileMetaData.data.mimeType;
		if (!matchesTarget) return null;

		if (
			options?.requireChangedEtag &&
			data.previousEtag &&
			targetMetaRes.data.etag === data.previousEtag &&
			targetMetaRes.data.etag !== mediaMetaRes.data.etag
		) {
			return null;
		}

		return targetMetaRes.data;
	};

	const failUpdate = async (
		message: string,
	): Promise<{ error: LucidErrorData; data: undefined }> => {
		await revertStorageDelta(delta);

		return {
			error: {
				type: "basic",
				message,
				status: 500,
				errors: {
					file: {
						code: "media_error",
						message,
					},
				},
			},
			data: undefined,
		};
	};

	if (data.targetKey === data.previousKey) {
		const updatedStreamRes = await mediaStrategyRes.data.stream(
			data.updatedKey,
		);
		if (updatedStreamRes.error) {
			await cleanupUpdatedKey();
			return await failUpdate(
				updatedStreamRes.error.message ?? T("an_unknown_error_occurred"),
			);
		}

		const uploadRes = await mediaStrategyRes.data.upload({
			key: data.targetKey,
			data:
				updatedStreamRes.data.body instanceof Uint8Array
					? Buffer.from(updatedStreamRes.data.body)
					: updatedStreamRes.data.body,
			meta: {
				mimeType: fileMetaData.data.mimeType,
				extension: fileMetaData.data.extension,
				size: mediaMetaRes.data.size,
				type: fileMetaData.data.type,
			},
		});

		const targetMeta =
			uploadRes.error === undefined
				? await getVerifiedTargetMeta()
				: await getVerifiedTargetMeta({
						requireChangedEtag: true,
					});

		if (!targetMeta) {
			await cleanupUpdatedKey();

			return await failUpdate(
				uploadRes.error?.message ?? T("an_unknown_error_occurred"),
			);
		}

		let sourceDeleted = true;
		const deleteUpdatedRes = await mediaStrategyRes.data.delete(
			data.updatedKey,
		);
		if (deleteUpdatedRes.error) {
			sourceDeleted = false;
		}

		return {
			error: undefined,
			data: {
				mimeType: targetMeta.mimeType ?? fileMetaData.data.mimeType,
				type: fileMetaData.data.type,
				extension: fileMetaData.data.extension,
				size: targetMeta.size,
				key: data.targetKey,
				etag: targetMeta.etag,
				sourceDeleted,
			},
		};
	}

	const promoteRes = await mediaStrategyRes.data.rename({
		from: data.updatedKey,
		to: data.targetKey,
	});
	if (promoteRes.error) {
		const targetVerified = await getVerifiedTargetMeta();
		if (!targetVerified) {
			return await failUpdate(
				promoteRes.error.message ?? T("an_unknown_error_occurred"),
			);
		}

		const deleteUpdatedRes = await mediaStrategyRes.data.delete(
			data.updatedKey,
		);
		const sourceDeleted = deleteUpdatedRes.error === undefined;

		if (data.targetKey !== data.previousKey) {
			const deleteOldRes = await mediaStrategyRes.data.delete(data.previousKey);
			if (deleteOldRes.error) {
				await mediaStrategyRes.data.delete(data.targetKey);
				await revertStorageDelta(delta);

				return {
					error: {
						type: "basic",
						message: deleteOldRes.error.message,
						status: 500,
						errors: {
							file: {
								code: "media_error",
								message: deleteOldRes.error.message,
							},
						},
					},
					data: undefined,
				};
			}
		}

		return {
			error: undefined,
			data: {
				mimeType: targetVerified.mimeType ?? fileMetaData.data.mimeType,
				type: fileMetaData.data.type,
				extension: fileMetaData.data.extension,
				size: targetVerified.size,
				key: data.targetKey,
				etag: targetVerified.etag,
				sourceDeleted,
			},
		};
	}

	const targetMeta = await getVerifiedTargetMeta();
	if (!targetMeta) {
		return await failUpdate(T("an_unknown_error_occurred"));
	}

	if (data.targetKey !== data.previousKey) {
		const deleteOldRes = await mediaStrategyRes.data.delete(data.previousKey);
		if (deleteOldRes.error) {
			await mediaStrategyRes.data.delete(data.targetKey);
			await revertStorageDelta(delta);

			return {
				error: {
					type: "basic",
					message: deleteOldRes.error.message,
					status: 500,
					errors: {
						file: {
							code: "media_error",
							message: deleteOldRes.error.message,
						},
					},
				},
				data: undefined,
			};
		}
	}

	return {
		error: undefined,
		data: {
			mimeType: targetMeta.mimeType ?? fileMetaData.data.mimeType,
			type: fileMetaData.data.type,
			extension: fileMetaData.data.extension,
			size: targetMeta.size,
			key: data.targetKey,
			etag: targetMeta.etag,
			sourceDeleted: true,
		},
	};
};

export default update;
