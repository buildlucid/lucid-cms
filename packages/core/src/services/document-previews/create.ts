import { randomBytes } from "node:crypto";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentPreviewsRepository } from "../../libs/repositories/index.js";
import type {
	DocumentPreviewURLResponse,
	DocumentVersionType,
} from "../../types.js";
import {
	hashPreviewToken,
	normalizePreviewUrl,
} from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getCollection from "../collections/get-single-instance.js";
import getClientDocument from "../documents/client/get-single.js";

const create: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionType: DocumentVersionType;
			versionId?: number;
			locale?: string;
			userId: number;
		},
	],
	DocumentPreviewURLResponse
> = async (context, data) => {
	const collectionRes = getCollection(context, { key: data.collectionKey });
	if (collectionRes.error) return collectionRes;

	const preview = collectionRes.data.config.preview;
	if (!preview) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.preview.not.configured.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const documentRes = await getClientDocument(context, {
		collectionKey: data.collectionKey,
		status: data.versionType,
		versionId: data.versionId,
		query: {
			filter: { id: { value: data.documentId } },
			include: ["bricks", "refs", "meta"],
		},
	});
	if (documentRes.error) return documentRes;

	const canonicalDocument = {
		...documentRes.data,
		id: data.documentId,
		collectionKey: data.collectionKey,
		status: data.versionType,
	};
	const locale =
		data.locale?.trim() || context.config.localization.defaultLocale;
	const token = randomBytes(32).toString("base64url");

	let resolvedUrl: string | URL | null;
	try {
		resolvedUrl = await preview.url({
			document: canonicalDocument,
			env: context.env,
			locale,
			tenantKey: context.request.tenantKey ?? null,
		});
	} catch {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.preview.url.invalid.message"),
				status: 400,
			},
			data: undefined,
		};
	}
	if (resolvedUrl === null) {
		return { error: undefined, data: { url: null, expiresAt: null } };
	}

	const expiresAt = new Date(
		Date.now() +
			(preview.expiresIn ??
				constants.collectionBuilder.previewExpirationSeconds) *
				1000,
	).toISOString();
	const normalizedUrlRes = await normalizePreviewUrl(resolvedUrl, token);
	if (normalizedUrlRes.error) return normalizedUrlRes;
	if (normalizedUrlRes.data === null) {
		return { error: undefined, data: { url: null, expiresAt: null } };
	}
	const url = normalizedUrlRes.data;

	const DocumentPreviews = new DocumentPreviewsRepository(
		context.db.client,
		context.config.db,
	);
	const createRes = await DocumentPreviews.createSingle({
		data: {
			token_hash: hashPreviewToken(token),
			collection_key: data.collectionKey,
			document_id: data.documentId,
			version_type: data.versionType,
			version_id:
				data.versionType === "revision" ||
				data.versionType ===
					constants.collectionBuilder.publishing.snapshotVersionType
					? (data.versionId ?? null)
					: null,
			tenant_key: context.request.tenantKey ?? null,
			expires_at: expiresAt,
			created_by: data.userId,
			created_at: new Date().toISOString(),
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (createRes.error) return createRes;

	return { error: undefined, data: { url, expiresAt } };
};

export default create;
