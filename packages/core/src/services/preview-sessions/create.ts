import { randomBytes } from "node:crypto";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { PreviewSessionsRepository } from "../../libs/repositories/index.js";
import type {
	DocumentVersionType,
	LucidAuth,
	PreviewMode,
	PreviewSessionURLResponse,
} from "../../types.js";
import {
	hashPreviewToken,
	normalizePreviewUrl,
} from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getCollection from "../collections/get-single-instance.js";
import getClientDocument from "../documents/client/get-single.js";
import validateClientVersionTarget from "../documents/helpers/validate-client-version-target.js";
import resolvePreviewMode, {
	requiresPinnedPreviewVersion,
} from "./helpers/resolve-preview-mode.js";

const create: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionType: DocumentVersionType;
			versionId?: number;
			mode?: PreviewMode;
			locale?: string;
			creator: LucidAuth;
		},
	],
	PreviewSessionURLResponse
> = async (context, data) => {
	const versionTargetRes = await validateClientVersionTarget({
		versionType: data.versionType,
		versionId: data.versionId,
	});
	if (versionTargetRes.error) return versionTargetRes;

	const modeRes = await resolvePreviewMode({
		versionType: data.versionType,
		mode: data.mode,
	});
	if (modeRes.error) return modeRes;

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
		target: {
			type: "version",
			versionType: data.versionType,
			versionId: versionTargetRes.data.versionId,
		},
		query: {
			filter: { id: { value: data.documentId } },
			include: ["bricks", "refs", "meta"],
		},
	});
	if (documentRes.error) return documentRes;

	const sourceVersionId = documentRes.data.meta?.versionId;
	if (
		typeof sourceVersionId !== "number" ||
		!Number.isInteger(sourceVersionId)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

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

	const PreviewSessions = new PreviewSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const createRes = await PreviewSessions.createSingle({
		data: {
			token_hash: hashPreviewToken(token),
			entry_collection_key: data.collectionKey,
			entry_document_id: data.documentId,
			entry_version_type: data.versionType,
			mode: modeRes.data,
			entry_version_id: requiresPinnedPreviewVersion(data.versionType)
				? sourceVersionId
				: null,
			expires_at: expiresAt,
			created_by: data.creator.id,
			created_at: new Date().toISOString(),
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: { url: normalizedUrlRes.data, expiresAt },
	};
};

export default create;
