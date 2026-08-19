import { copy } from "../../libs/i18n/index.js";
import type { MediaStorageAdapterAbortUploadSessionParams } from "../../libs/media-storage/types.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const abortUploadSession: ServiceFn<
	[
		{
			sessionId: string;
		},
	],
	undefined
> = async (context, data) => {
	const MediaUploadSessions = new MediaUploadSessionsRepository(context.db);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);

	const sessionRes = await MediaUploadSessions.selectSingle({
		select: [
			"session_id",
			"key",
			"adapter_key",
			"adapter_upload_id",
			"protocol",
			"status",
		],
		where: [{ key: "session_id", operator: "=", value: data.sessionId }],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
			},
		},
	});
	if (sessionRes.error) return sessionRes;

	if (!context.mediaStorage) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.storage.adapter.not.enabled"),
			},
			data: undefined,
		};
	}
	if (sessionRes.data.adapter_key !== context.mediaStorage.key) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.upload.sessions.adapter.changed"),
			},
			data: undefined,
		};
	}

	if (context.mediaStorage.abortUploadSession) {
		const adapterUploadId = sessionRes.data.adapter_upload_id;
		let abortParams: MediaStorageAdapterAbortUploadSessionParams;
		if (sessionRes.data.protocol === "multipart-parts") {
			if (!adapterUploadId) {
				return {
					error: {
						type: "basic",
						status: 400,
						message: copy(
							"server:core.media.upload.sessions.missing.adapter.upload.id",
						),
					},
					data: undefined,
				};
			}
			abortParams = {
				protocol: "multipart-parts",
				key: sessionRes.data.key,
				uploadId: adapterUploadId,
			};
		} else if (sessionRes.data.protocol === "tus") {
			abortParams = {
				protocol: "tus",
				key: sessionRes.data.key,
				uploadId: adapterUploadId ?? undefined,
			};
		} else {
			abortParams = { protocol: "http", key: sessionRes.data.key };
		}
		const abortRes = await context.mediaStorage.abortUploadSession(
			context,
			abortParams,
		);
		if (abortRes.error) return abortRes;
	}

	const [deleteAwaitingRes, deleteMediaRes] = await Promise.all([
		MediaAwaitingSync.deleteSingle({
			where: [{ key: "key", operator: "=", value: sessionRes.data.key }],
		}),
		context.mediaStorage.delete(context, {
			key: sessionRes.data.key,
		}),
	]);
	if (deleteAwaitingRes.error) return deleteAwaitingRes;
	if (deleteMediaRes.error) return deleteMediaRes;

	const deleteSessionRes = await MediaUploadSessions.deleteSingle({
		where: [{ key: "session_id", operator: "=", value: data.sessionId }],
		returning: ["session_id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteSessionRes.error) return deleteSessionRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default abortUploadSession;
