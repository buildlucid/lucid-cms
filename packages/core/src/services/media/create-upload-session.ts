import type { UploadSessionResponse } from "@lucidcms/types";
import { addMilliseconds } from "date-fns";
import mime from "mime-types";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import { generateKey, resolveMediaTenant } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkCanStoreMedia from "./checks/check-can-store-media.js";

const createSessionId = () => {
	return globalThis.crypto.randomUUID();
};

const createUploadSession: ServiceFn<
	[
		{
			fileName: string;
			mimeType: string;
			size: number;
			public: boolean;
			temporary?: boolean;
			userId: number;
		},
	],
	UploadSessionResponse
> = async (context, data) => {
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

	const sizeRes = await checkCanStoreMedia(context, {
		size: data.size,
	});
	if (sizeRes.error) return sizeRes;

	const extension = mime.extension(data.mimeType);

	const keyRes = generateKey({
		name: data.fileName,
		public: data.public,
		tenantKey: context.request.tenantKey ?? null,
		temporary: data.temporary,
	});
	if (keyRes.error) return keyRes;

	const tenant = resolveMediaTenant(
		context.config,
		context.request.tenantKey ?? null,
	);

	const sessionRes = await context.media.createUploadSession({
		context,
		key: keyRes.data,
		meta: {
			host: getBaseUrl(context),
			secretKey: context.config.secrets.cookie,
			mimeType: data.mimeType,
			extension: extension || undefined,
			size: data.size,
		},
		tenant,
	});
	if (sessionRes.error) {
		return {
			error: {
				type: "basic",
				message: sessionRes.error.message,
				status: 500,
				errors: {
					file: {
						code: "media_error",
						message: sessionRes.error.message,
					},
				},
			},
			data: undefined,
		};
	}
	const uploadKey = sessionRes.data.key;

	if (sessionRes.data.mode === "single") {
		const MediaAwaitingSync = new MediaAwaitingSyncRepository(
			context.db.client,
			context.config.db,
		);
		const awaitingSyncRes = await MediaAwaitingSync.createSingle({
			data: {
				key: uploadKey,
				timestamp: new Date().toISOString(),
			},
			returning: ["key"],
			validation: {
				enabled: true,
			},
		});
		if (awaitingSyncRes.error) return awaitingSyncRes;

		return {
			error: undefined,
			data: {
				mode: "single",
				key: uploadKey,
				url: sessionRes.data.url,
				headers: sessionRes.data.headers,
			},
		};
	}

	const MediaUploadSessions = new MediaUploadSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const sessionId = createSessionId();
	const now = new Date().toISOString();
	const expiresAt =
		sessionRes.data.expiresAt ??
		addMilliseconds(
			new Date(),
			constants.uploadSessionExpiration,
		).toISOString();

	const createRes = await MediaUploadSessions.createSingle({
		data: {
			session_id: sessionId,
			key: uploadKey,
			adapter_key: context.media.key,
			adapter_upload_id: sessionRes.data.uploadId,
			mode: "resumable",
			status: "active",
			file_name: data.fileName,
			mime_type: data.mimeType,
			file_extension: extension || null,
			file_size: data.size,
			part_size: sessionRes.data.partSize,
			created_by: data.userId,
			created_at: now,
			updated_at: now,
			expires_at: expiresAt,
		},
		returning: ["session_id"],
		validation: {
			enabled: true,
		},
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: {
			mode: "resumable",
			key: uploadKey,
			sessionId,
			partSize: sessionRes.data.partSize,
			expiresAt,
			uploadedParts: sessionRes.data.uploadedParts,
		},
	};
};

export default createUploadSession;
