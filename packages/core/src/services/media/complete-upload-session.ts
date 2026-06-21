import { copy } from "../../libs/i18n/index.js";
import { hasResumableUploadSessions } from "../../libs/media/resumable-upload-sessions.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import { resolveMediaKeyTenant } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkMediaKeyAccess from "./checks/check-media-key-access.js";

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
		select: ["session_id", "key", "adapter_key", "adapter_upload_id", "status"],
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

	const keyAccessRes = await checkMediaKeyAccess(context, {
		key: sessionRes.data.key,
	});
	if (keyAccessRes.error) return keyAccessRes;

	if (!context.media) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.adapters.not.enabled"),
			},
			data: undefined,
		};
	}
	if (sessionRes.data.adapter_key !== context.media.key) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.upload.sessions.adapter.changed"),
			},
			data: undefined,
		};
	}
	if (!hasResumableUploadSessions(context.media)) {
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

	const completeRes = await context.media.completeUploadSession(context, {
		key: sessionRes.data.key,
		uploadId: sessionRes.data.adapter_upload_id,
		parts: data.parts,
		tenant: resolveMediaKeyTenant(context.config, sessionRes.data.key),
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
