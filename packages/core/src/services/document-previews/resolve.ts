import { documentPreviewsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentPreviewsRepository } from "../../libs/repositories/index.js";
import type { DocumentPreviewResolveResponse } from "../../types.js";
import { hashPreviewToken } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const previewTokenPattern = /^[A-Za-z0-9_-]{43}$/;

const resolve: ServiceFn<
	[{ token: string }],
	DocumentPreviewResolveResponse
> = async (context, data) => {
	if (!previewTokenPattern.test(data.token)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.preview.token.invalid.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	const DocumentPreviews = new DocumentPreviewsRepository(
		context.db.client,
		context.config.db,
	);
	const previewRes = await DocumentPreviews.selectSingle({
		select: [
			"collection_key",
			"document_id",
			"version_type",
			"version_id",
			"tenant_key",
			"expires_at",
		],
		where: [
			{
				key: "token_hash",
				operator: "=",
				value: hashPreviewToken(data.token),
			},
			{ key: "expires_at", operator: ">", value: new Date().toISOString() },
		],
		validation: { enabled: false },
	});
	if (previewRes.error) return previewRes;

	const preview = previewRes.data;
	const tenantKey = context.request.tenantKey;
	if (
		preview === undefined ||
		(tenantKey != null &&
			preview.tenant_key !== null &&
			preview.tenant_key !== tenantKey)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.preview.token.invalid.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: documentPreviewsFormatter.formatSingle({ preview }),
	};
};

export default resolve;
