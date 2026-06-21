import { copy } from "../../libs/i18n/index.js";
import { hasResumableUploadSessions } from "../../libs/media/resumable-upload-sessions.js";
import { MediaUploadSessionsRepository } from "../../libs/repositories/index.js";
import { resolveMediaKeyTenant } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkMediaKeyAccess from "./checks/check-media-key-access.js";

const getUploadPartUrls: ServiceFn<
	[
		{
			sessionId: string;
			partNumbers: number[];
		},
	],
	{
		parts: Array<{
			partNumber: number;
			url: string;
			headers?: Record<string, string>;
		}>;
	}
> = async (context, data) => {
	const MediaUploadSessions = new MediaUploadSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const sessionRes = await MediaUploadSessions.selectSingle({
		select: ["key", "adapter_key", "adapter_upload_id", "expires_at", "status"],
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

	const urlsRes = await context.media.getUploadPartUrls({
		context,
		key: sessionRes.data.key,
		uploadId: sessionRes.data.adapter_upload_id,
		partNumbers: data.partNumbers,
		expiresAt: new Date(
			sessionRes.data.expires_at as string | Date,
		).toISOString(),
		tenant: resolveMediaKeyTenant(context.config, sessionRes.data.key),
	});
	if (urlsRes.error) return urlsRes;

	return {
		error: undefined,
		data: urlsRes.data,
	};
};

export default getUploadPartUrls;
