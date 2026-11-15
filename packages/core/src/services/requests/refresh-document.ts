import { copy } from "../../libs/i18n/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import align from "../documents-versions/align.js";
import readVersionContent from "../documents-versions/helpers/read-version-content.js";
import loadRequest from "./helpers/load-request.js";

/**
 * Refreshes a publish request's copy from latest, dismissing approval when content changes. Leaves
 * matching copies untouched.
 */
const refreshDocument: ServiceFn<
	[{ id: number; requestDocumentId: number; user: LucidUser }],
	undefined
> = async (context, data) => {
	const requestRes = await loadRequest(context, {
		id: data.id,
		user: data.user,
	});
	if (requestRes.error) return requestRes;

	const document = requestRes.data.documents.find(
		(document) => document.id === data.requestDocumentId,
	);
	if (!document) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.document.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (
		requestRes.data.type !== "publish" ||
		document.source !== "latest" ||
		document.source_version_id === null
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.refresh.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	const [latestRes, copyRes] = await Promise.all([
		readVersionContent(context, {
			collectionKey: document.collection_key,
			documentId: document.document_id,
			versionType: "latest",
		}),
		readVersionContent(context, {
			collectionKey: document.collection_key,
			documentId: document.document_id,
			versionId: document.source_version_id,
		}),
	]);
	if (latestRes.error) return latestRes;
	if (copyRes.error) return copyRes;
	if (!latestRes.data || !copyRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.item.source.missing"),
				status: 404,
			},
			data: undefined,
		};
	}

	//* align checks the person can edit the request and replaces the copy in one write
	const alignRes = await align(context, {
		collectionKey: document.collection_key,
		documentId: document.document_id,
		versionId: document.source_version_id,
		source: "latest",
		sourceContentId: latestRes.data.contentId,
		destinationContentId: copyRes.data.contentId,
		user: data.user,
	});
	if (alignRes.error) return alignRes;

	return { error: undefined, data: undefined };
};

export default refreshDocument;
