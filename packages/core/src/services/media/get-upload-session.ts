import type { UploadSessionStateResponse } from "@lucidcms/types";
import { copy } from "../../libs/i18n/index.js";
import getMediaAdapter from "../../libs/media/get-adapter.js";
import { hasResumableUploadSessions } from "../../libs/media/resumable-upload-sessions.js";
import { MediaUploadSessionsRepository } from "../../libs/repositories/index.js";
import { resolveMediaKeyTenant } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getUploadSession: ServiceFn<
	[
		{
			sessionId: string;
		},
	],
	UploadSessionStateResponse
> = async (context, data) => {
	const MediaUploadSessions = new MediaUploadSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const sessionRes = await MediaUploadSessions.selectSingle({
		select: [
			"session_id",
			"key",
			"adapter_key",
			"adapter_upload_id",
			"part_size",
			"expires_at",
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

	const mediaAdapter = await getMediaAdapter(context.config);
	if (!mediaAdapter.enabled) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.adapters.not.enabled"),
			},
			data: undefined,
		};
	}
	if (sessionRes.data.adapter_key !== mediaAdapter.adapter.key) {
		return {
			error: undefined,
			data: {
				canResume: false,
				sessionId: sessionRes.data.session_id,
				reason: "adapter_changed",
			},
		};
	}
	if (!hasResumableUploadSessions(mediaAdapter.adapter)) {
		return {
			error: undefined,
			data: {
				canResume: false,
				sessionId: sessionRes.data.session_id,
				reason: "adapter_not_resumable",
			},
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
	if (!sessionRes.data.part_size) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.upload.sessions.missing.part.size"),
			},
			data: undefined,
		};
	}

	const partsRes = await mediaAdapter.adapter.listUploadParts({
		key: sessionRes.data.key,
		uploadId: sessionRes.data.adapter_upload_id,
		context: {
			tenant: resolveMediaKeyTenant(context.config, sessionRes.data.key),
		},
	});
	if (partsRes.error) return partsRes;

	return {
		error: undefined,
		data: {
			canResume: true,
			key: sessionRes.data.key,
			sessionId: sessionRes.data.session_id,
			partSize: sessionRes.data.part_size,
			expiresAt: new Date(
				sessionRes.data.expires_at as string | Date,
			).toISOString(),
			uploadedParts: partsRes.data.uploadedParts,
		},
	};
};

export default getUploadSession;
