import { randomUUID } from "node:crypto";
import collections from "../../libs/collection/collections.js";
import getContentAccess from "../../libs/collection/field-access/get-content-access.js";
import resolveCollectionLocalization from "../../libs/collection/helpers/resolve-collection-localization.js";
import { copy } from "../../libs/i18n/index.js";
import { enqueueJob } from "../../libs/jobs/enqueue.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import { Permissions } from "../../libs/permission/definitions.js";
import hasAccess from "../../libs/permission/has-access.js";
import type { ContentInput } from "../../libs/translations/list-content-fields.js";
import type { LucidErrorData } from "../../types/errors.js";
import type { LucidActor } from "../../types/hono.js";
import type { TranslateDocumentsResponse } from "../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import checkFeatureEnabled from "../ai/checks/check-feature-enabled.js";
import readDocumentContent from "../documents/helpers/read-document-content.js";
import getSettings from "./get-settings.js";
import getRequestProposals from "./helpers/get-request-proposals.js";
import openTranslationRequest from "./helpers/open-translation-request.js";
import saveTranslatedLatest from "./helpers/save-translated-latest.js";
import saveTranslatedProposals from "./helpers/save-translated-proposals.js";
import { translateDocumentsJob } from "./jobs/translate.js";
import translateContent from "./translate-content.js";

type TranslateDocumentsInput = {
	collectionKey: string;
	documentIds: number[];
	/** Defaults to the request's locales, or every locale but the collection's default. */
	targetLocales?: string[];
	/** Replaces people's translations too. */
	overwrite?: boolean;
	note?: string;
	/** Into requests for review, straight into latest without review, or returned for the open editor. */
	delivery: TranslateDocumentsResponse["delivery"];
	/** An open request whose proposals are translated, for request delivery. The documents must already be in it. Opens a request per locale when left out. */
	requestId?: number;
	/** The open editor's unsaved content, for editor delivery. Defaults to the saved document. */
	content?: ContentInput;
	/** Runs new requests for several documents in a background job. */
	queue?: boolean;
	/** Refuses to save into latest or an existing proposal while someone has it open in an editor, as agent writes do. The person the change is for is told to use the builder instead. */
	editorHolds?: { userId: number | null };
	user: LucidActor;
	agentRunId?: string;
};

type Delivery<T extends TranslateDocumentsResponse["delivery"]> = Extract<
	TranslateDocumentsResponse,
	{ delivery: T }
>;

/**
 * Translates from the default locale into separate locale-limited review requests. `requestId`
 * targets existing proposals; latest delivery bypasses review; editor delivery returns unsaved
 * values.
 */
function translateDocuments(
	context: ServiceContext,
	data: TranslateDocumentsInput & { delivery: "request" },
): ServiceResponse<Delivery<"request">>;
function translateDocuments(
	context: ServiceContext,
	data: TranslateDocumentsInput & { delivery: "latest" },
): ServiceResponse<Delivery<"latest">>;
function translateDocuments(
	context: ServiceContext,
	data: TranslateDocumentsInput,
): ServiceResponse<TranslateDocumentsResponse>;
async function translateDocuments(
	context: ServiceContext,
	data: TranslateDocumentsInput,
): ServiceResponse<TranslateDocumentsResponse> {
	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const collection = collectionRes.data;
	const localization = resolveCollectionLocalization({
		localization: context.config.localization,
		collection,
	});

	if (
		!hasAccess({
			user: data.user,
			requiredPermissions: [Permissions.AiTranslate],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.translations.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const documentIds = [...new Set(data.documentIds)];
	//* every delivery changes content, and requests also need request access, so this is checked before anything is spent
	if (
		!hasAccess({
			user: data.user,
			requiredPermissions: [
				getCollectionPermission(collection.key, "read"),
				getCollectionPermission(collection.key, "update"),
				...(data.delivery === "request" ? [Permissions.RequestsRead] : []),
			],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.collections.permission.error.message", {
					data: { collection: collection.key, action: "update" },
				}),
				status: 403,
			},
			data: undefined,
		};
	}
	if (data.delivery === "editor" && documentIds.length !== 1) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.translations.editor.single"),
				status: 400,
			},
			data: undefined,
		};
	}

	const requestId = data.delivery === "request" ? data.requestId : undefined;
	const proposalsRes =
		requestId === undefined
			? undefined
			: await getRequestProposals(context, {
					requestId,
					collectionKey: collection.key,
					documentIds,
					user: data.user,
				});
	if (proposalsRes?.error) return proposalsRes;
	const proposals = proposalsRes?.data;

	//* a locale-limited request only takes its own locales
	const allowedLocales = localization.locales.filter(
		(locale) =>
			locale !== localization.defaultLocale &&
			(!proposals?.locales || proposals.locales.includes(locale)),
	);
	const targetLocales = [...new Set(data.targetLocales ?? allowedLocales)];
	if (
		!localization.enabled ||
		targetLocales.length === 0 ||
		targetLocales.some((locale) => !allowedLocales.includes(locale))
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.translations.locales.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	//* checked before queueing, so a background run can't be accepted and then fail
	const featureRes = await checkFeatureEnabled(context, {
		feature: "translation",
	});
	if (featureRes.error) return featureRes;

	if (
		data.delivery === "request" &&
		!proposals &&
		data.queue &&
		documentIds.length > 1
	) {
		const agent = data.agentRunId ? { agentRunId: data.agentRunId } : {};
		for (const locale of targetLocales) {
			const queueRes = await enqueueJob(context, {
				job: translateDocumentsJob,
				payload: {
					collectionKey: collection.key,
					documentIds,
					locale,
					overwrite: data.overwrite ?? false,
					note: data.note,
					actor:
						data.user.id === null
							? { type: "system", ...agent }
							: { type: "user", userId: data.user.id, ...agent },
				},
				options: { createdByUserId: data.user.id ?? undefined },
			});
			if (queueRes.error) return queueRes;
		}

		return {
			error: undefined,
			data: { delivery: "request", requests: [], queued: true, failures: [] },
		};
	}

	const documents: Array<{ id: number; content: ContentInput }> = [];
	for (const id of documentIds) {
		if (data.delivery === "editor" && data.content) {
			documents.push({ id, content: data.content });
			continue;
		}

		const contentRes = await readDocumentContent(context, {
			collectionKey: collection.key,
			id,
			versionId: proposals?.proposals.find(
				(proposal) => proposal.documentId === id,
			)?.versionId,
		});
		if (contentRes.error) return contentRes;
		documents.push({ id, content: contentRes.data.stored });
	}

	const settingsRes = await getSettings(context);
	if (settingsRes.error) return settingsRes;

	const translatedRes = await translateContent(context, {
		collection,
		documents,
		locales: targetLocales,
		overwrite: data.overwrite ?? false,
		note: data.note,
		settings: settingsRes.data,
		access: getContentAccess(collection, data.user),
		userId: data.user.id,
		sessionId: randomUUID(),
	});
	if (translatedRes.error) return translatedRes;

	const { changes, failures } = translatedRes.data;
	if (data.delivery === "editor") {
		return {
			error: undefined,
			data: {
				delivery: "editor",
				changes: changes.map(
					({ documentId: _documentId, ...change }) => change,
				),
				failures,
			},
		};
	}

	if (data.delivery === "latest") {
		const savedRes = await saveTranslatedLatest(context, {
			collection,
			localization,
			documentIds,
			changes,
			overwrite: data.overwrite ?? false,
			user: data.user,
			agentRunId: data.agentRunId,
			editorHolds: data.editorHolds,
		});
		if (savedRes.error) return savedRes;

		return {
			error: undefined,
			data: {
				delivery: "latest",
				documents: savedRes.data.documents,
				failures: [...failures, ...savedRes.data.failures],
			},
		};
	}

	if (requestId !== undefined && proposals) {
		const savedRes = await withTransaction(context, (context) =>
			saveTranslatedProposals(context, {
				collection,
				localization,
				proposals: proposals.proposals,
				changes,
				overwrite: data.overwrite ?? false,
				user: data.user,
				agentRunId: data.agentRunId,
				editorHolds: data.editorHolds && {
					requestId,
					userId: data.editorHolds.userId,
				},
			}),
		);
		if (savedRes.error) return savedRes;

		return {
			error: undefined,
			data: {
				delivery: "request",
				requests: targetLocales.flatMap((locale) => {
					const translated = new Set(
						changes
							.filter((change) => change.locale === locale)
							.map((change) => change.documentId),
					);
					return translated.size > 0
						? [{ id: requestId, locale, documents: translated.size }]
						: [];
				}),
				queued: false,
				failures,
			},
		};
	}

	const requests: Delivery<"request">["requests"] = [];
	const errors: LucidErrorData[] = [];
	for (const locale of targetLocales) {
		const localeChanges = changes.filter((change) => change.locale === locale);
		const translatedIds = documentIds.filter((id) =>
			localeChanges.some((change) => change.documentId === id),
		);
		if (translatedIds.length === 0) continue;

		const requestRes = await openTranslationRequest(context, {
			collection,
			localization,
			locale,
			documentIds: translatedIds,
			changes: localeChanges,
			overwrite: data.overwrite ?? false,
			user: data.user,
			agentRunId: data.agentRunId,
		});
		//* other locales' requests are already open, so a failure is reported beside them
		if (requestRes.error) {
			errors.push(requestRes.error);
			const message = context.translate(
				requestRes.error.message ??
					copy("server:core.translations.request.failed"),
			);
			for (const documentId of translatedIds) {
				failures.push({ documentId, locale, field: null, message });
			}
			continue;
		}

		requests.push({
			id: requestRes.data.id,
			locale,
			documents: translatedIds.length,
		});
	}

	const firstError = errors[0];
	if (requests.length === 0 && firstError) {
		return { error: firstError, data: undefined };
	}

	return {
		error: undefined,
		data: { delivery: "request", requests, queued: false, failures },
	};
}

export default translateDocuments;
