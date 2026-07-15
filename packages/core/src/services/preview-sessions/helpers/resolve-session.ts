import { copy } from "../../../libs/i18n/index.js";
import { PreviewSessionsRepository } from "../../../libs/repositories/index.js";
import { hashPreviewToken } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ResolvedPreviewSession } from "../types.js";
import isExactPreview from "./is-exact-preview.js";

const previewTokenPattern = /^[A-Za-z0-9_-]{43}$/;

const resolveSession: ServiceFn<
	[{ token: string }],
	ResolvedPreviewSession
> = async (context, data) => {
	if (!previewTokenPattern.test(data.token)) {
		return {
			error: {
				type: "authorisation",
				code: "preview_invalid",
				message: copy("server:core.documents.preview.invalid.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	const PreviewSessions = new PreviewSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const sessionRes = await PreviewSessions.selectSingle({
		select: [
			"id",
			"entry_collection_key",
			"entry_document_id",
			"entry_version_type",
			"entry_version_id",
			"expires_at",
		],
		where: [
			{
				key: "token_hash",
				operator: "=",
				value: hashPreviewToken(data.token),
			},
		],
		validation: { enabled: false },
	});
	if (sessionRes.error) return sessionRes;
	if (!sessionRes.data) {
		return {
			error: {
				type: "authorisation",
				code: "preview_invalid",
				message: copy("server:core.documents.preview.invalid.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	const session = sessionRes.data;
	if (
		(isExactPreview(session.entry_version_type) &&
			session.entry_version_id === null) ||
		(!isExactPreview(session.entry_version_type) &&
			session.entry_version_id !== null)
	) {
		return {
			error: {
				type: "authorisation",
				code: "preview_invalid",
				message: copy("server:core.documents.preview.invalid.message"),
				status: 401,
			},
			data: undefined,
		};
	}
	if (new Date(session.expires_at).getTime() <= Date.now()) {
		return {
			error: {
				type: "authorisation",
				code: "preview_expired",
				message: copy("server:core.documents.preview.expired.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: session,
	};
};

export default resolveSession;
