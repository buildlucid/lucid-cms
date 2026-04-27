import getMediaAdapter from "../../libs/media/get-adapter.js";
import { MediaUploadSessionsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getUploadSession: ServiceFn<
	[
		{
			sessionId: string;
		},
	],
	{
		mode: "resumable";
		key: string;
		sessionId: string;
		partSize: number;
		expiresAt: string;
		uploadedParts: Array<{
			partNumber: number;
			etag: string;
			size?: number;
		}>;
	}
> = async (context, data) => {
	const MediaUploadSessions = new MediaUploadSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const sessionRes = await MediaUploadSessions.selectSingle({
		select: [
			"session_id",
			"key",
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
				message: T("media_adapter_not_enabled"),
			},
			data: undefined,
		};
	}
	if (!mediaAdapter.adapter.listUploadParts) {
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
	if (!sessionRes.data.part_size) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("media_upload_session_missing_part_size"),
			},
			data: undefined,
		};
	}

	const partsRes = await mediaAdapter.adapter.listUploadParts({
		key: sessionRes.data.key,
		uploadId: sessionRes.data.adapter_upload_id,
	});
	if (partsRes.error) return partsRes;

	return {
		error: undefined,
		data: {
			mode: "resumable",
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
