import type { UploadSessionStateResponse } from "@lucidcms/types";
import { copy } from "../../libs/i18n/index.js";
import { hasMultipartUploadSessions } from "../../libs/media-storage/resumable-upload-sessions.js";
import { MediaUploadSessionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getUploadSession: ServiceFn<
	[
		{
			sessionId: string;
		},
	],
	UploadSessionStateResponse
> = async (context, data) => {
	const MediaUploadSessions = new MediaUploadSessionsRepository(context.db);
	const sessionRes = await MediaUploadSessions.selectSingle({
		select: [
			"session_id",
			"key",
			"adapter_key",
			"adapter_upload_id",
			"protocol",
			"client_data",
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
			error: undefined,
			data: {
				canResume: false,
				sessionId: sessionRes.data.session_id,
				reason: "adapter_changed",
			},
		};
	}
	if (sessionRes.data.protocol === "http") {
		return {
			error: undefined,
			data: {
				canResume: false,
				sessionId: sessionRes.data.session_id,
				reason: "protocol_not_resumable",
			},
		};
	}
	if (sessionRes.data.protocol === "tus") {
		const endpoint = sessionRes.data.client_data?.endpoint;
		const headers = sessionRes.data.client_data?.headers;
		const metadata = sessionRes.data.client_data?.metadata;
		if (
			typeof endpoint !== "string" ||
			typeof headers !== "object" ||
			headers === null ||
			Array.isArray(headers)
		) {
			return {
				error: undefined,
				data: {
					canResume: false,
					sessionId: sessionRes.data.session_id,
					reason: "protocol_not_resumable",
				},
			};
		}

		return {
			error: undefined,
			data: {
				canResume: true,
				protocol: "tus",
				key: sessionRes.data.key,
				sessionId: sessionRes.data.session_id,
				expiresAt: new Date(sessionRes.data.expires_at).toISOString(),
				endpoint,
				headers: Object.fromEntries(
					Object.entries(headers).filter(
						(entry): entry is [string, string] => typeof entry[1] === "string",
					),
				),
				metadata:
					typeof metadata === "object" &&
					metadata !== null &&
					!Array.isArray(metadata)
						? Object.fromEntries(
								Object.entries(metadata).filter(
									(entry): entry is [string, string] =>
										typeof entry[1] === "string",
								),
							)
						: undefined,
			},
		};
	}
	if (!hasMultipartUploadSessions(context.mediaStorage)) {
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

	const partsRes = await context.mediaStorage.listUploadParts(context, {
		key: sessionRes.data.key,
		uploadId: sessionRes.data.adapter_upload_id,
	});
	if (partsRes.error) return partsRes;

	return {
		error: undefined,
		data: {
			canResume: true,
			protocol: "multipart-parts",
			key: sessionRes.data.key,
			sessionId: sessionRes.data.session_id,
			partSize: sessionRes.data.part_size,
			expiresAt: new Date(sessionRes.data.expires_at).toISOString(),
			uploadedParts: partsRes.data.uploadedParts,
		},
	};
};

export default getUploadSession;
