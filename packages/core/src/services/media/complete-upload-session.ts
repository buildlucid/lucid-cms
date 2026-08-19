import { copy } from "../../libs/i18n/index.js";
import { hasMultipartUploadSessions } from "../../libs/media-storage/resumable-upload-sessions.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const completeUploadSession: ServiceFn<
	[
		{
			sessionId: string;
			parts?: Array<{
				partNumber: number;
				etag: string;
				size?: number;
			}>;
		},
	],
	{
		key: string;
	}
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
		where: [
			{ key: "session_id", operator: "=", value: data.sessionId },
			{ key: "status", operator: "=", value: "active" },
		],
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
	if (sessionRes.data.protocol === "multipart-parts") {
		if (!hasMultipartUploadSessions(context.mediaStorage)) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy(
						"server:core.media.upload.sessions.resumable.not.supported",
					),
				},
				data: undefined,
			};
		}
		if (!sessionRes.data.adapter_upload_id) {
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
		if (!data.parts?.length) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy(
						"server:core.media.upload.sessions.parts.not.reconciled",
					),
				},
				data: undefined,
			};
		}

		const completeRes = await context.mediaStorage.completeUploadSession(
			context,
			{
				protocol: "multipart-parts",
				key: sessionRes.data.key,
				uploadId: sessionRes.data.adapter_upload_id,
				parts: data.parts,
			},
		);
		if (completeRes.error) return completeRes;
	} else if (context.mediaStorage.completeUploadSession) {
		const completeRes = await context.mediaStorage.completeUploadSession(
			context,
			sessionRes.data.protocol === "http"
				? {
						protocol: "http",
						key: sessionRes.data.key,
					}
				: {
						protocol: "tus",
						key: sessionRes.data.key,
						uploadId: sessionRes.data.adapter_upload_id ?? undefined,
					},
		);
		if (completeRes.error) return completeRes;
	}

	const metaRes = await context.mediaStorage.getMeta(context, {
		key: sessionRes.data.key,
	});
	if (metaRes.error) return metaRes;

	await MediaAwaitingSync.deleteSingle({
		where: [{ key: "key", operator: "=", value: sessionRes.data.key }],
	});

	const now = new Date().toISOString();
	const [awaitingSyncRes, updateSessionRes] = await Promise.all([
		MediaAwaitingSync.createSingle({
			data: {
				key: sessionRes.data.key,
				timestamp: now,
			},
			returning: ["key"],
			validation: {
				enabled: true,
			},
		}),
		MediaUploadSessions.updateSingle({
			where: [{ key: "session_id", operator: "=", value: data.sessionId }],
			data: {
				status: "completed",
				updated_at: now,
			},
			returning: ["session_id"],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (awaitingSyncRes.error) return awaitingSyncRes;
	if (updateSessionRes.error) return updateSessionRes;

	return {
		error: undefined,
		data: {
			key: sessionRes.data.key,
		},
	};
};

export default completeUploadSession;
