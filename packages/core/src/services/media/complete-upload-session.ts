import getMediaAdapter from "../../libs/media/get-adapter.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const completeUploadSession: ServiceFn<
	[
		{
			sessionId: string;
			parts: Array<{
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
	const MediaUploadSessions = new MediaUploadSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db.client,
		context.config.db,
	);

	const sessionRes = await MediaUploadSessions.selectSingle({
		select: ["session_id", "key", "adapter_upload_id", "status"],
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

	const mediaAdapter = await getMediaAdapter(context.config);
	if (!mediaAdapter.enabled) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("media_adapter_not_enabled"),
			},
			data: undefined,
		};
	}
	if (!mediaAdapter.adapter.completeUploadSession) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("media_upload_session_resumable_not_supported"),
			},
			data: undefined,
		};
	}
	if (!sessionRes.data.adapter_upload_id) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("media_upload_session_missing_adapter_upload_id"),
			},
			data: undefined,
		};
	}

	const completeRes = await mediaAdapter.adapter.completeUploadSession({
		key: sessionRes.data.key,
		uploadId: sessionRes.data.adapter_upload_id,
		parts: data.parts,
	});
	if (completeRes.error) return completeRes;

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
