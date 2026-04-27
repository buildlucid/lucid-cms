import getMediaAdapter from "../../libs/media/get-adapter.js";
import { MediaUploadSessionsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

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
		select: ["key", "adapter_upload_id", "expires_at", "status"],
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
	if (!mediaAdapter.adapter.getUploadPartUrls) {
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

	const urlsRes = await mediaAdapter.adapter.getUploadPartUrls({
		key: sessionRes.data.key,
		uploadId: sessionRes.data.adapter_upload_id,
		partNumbers: data.partNumbers,
		expiresAt: new Date(
			sessionRes.data.expires_at as string | Date,
		).toISOString(),
	});
	if (urlsRes.error) return urlsRes;

	return {
		error: undefined,
		data: urlsRes.data,
	};
};

export default getUploadPartUrls;
