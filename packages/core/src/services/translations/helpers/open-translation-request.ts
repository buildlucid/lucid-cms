import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import type { ResolvedCollectionLocalization } from "../../../libs/collection/helpers/resolve-collection-localization.js";
import { copy } from "../../../libs/i18n/index.js";
import { RequestDocumentsRepository } from "../../../libs/repositories/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { TranslationChange } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import createRequest from "../../requests/create-single.js";
import saveTranslatedProposals from "./save-translated-proposals.js";

/**
 * Opens a request limited to one locale for the translated documents and
 * fills each proposal with its translations, all in one transaction, so a
 * failure leaves no half-filled request behind.
 */
const openTranslationRequest: ServiceFn<
	[
		{
			collection: CollectionDefinition;
			localization: ResolvedCollectionLocalization;
			locale: string;
			documentIds: number[];
			changes: Array<TranslationChange & { documentId: number }>;
			overwrite: boolean;
			user: LucidActor;
			agentRunId?: string;
		},
	],
	{ id: number }
> = (context, data) =>
	withTransaction(context, async (context) => {
		const label =
			context.config.localization.locales.find(
				(entry) => entry.code === data.locale,
			)?.label ?? data.locale;
		const createdRes = await createRequest(context, {
			type: "publish",
			title: context.translate(
				copy(
					data.documentIds.length === 1
						? "server:core.translations.request.title.one"
						: "server:core.translations.request.title",
					{ data: { locale: label, count: data.documentIds.length } },
				),
			),
			documents: data.documentIds.map((documentId) => ({
				collectionKey: data.collection.key,
				documentId,
				source: "latest",
				targets: ["latest"],
			})),
			locales: [data.locale],
			user: data.user,
			agentRunId: data.agentRunId,
		});
		if (createdRes.error) return createdRes;

		const RequestDocuments = new RequestDocumentsRepository(context.db);
		const proposalsRes = await RequestDocuments.selectMultiple({
			select: ["document_id", "source_version_id"],
			where: [{ key: "request_id", operator: "=", value: createdRes.data.id }],
			validation: { enabled: true },
		});
		if (proposalsRes.error) return proposalsRes;

		const savedRes = await saveTranslatedProposals(context, {
			collection: data.collection,
			localization: data.localization,
			proposals: proposalsRes.data.flatMap((proposal) =>
				proposal.source_version_id === null
					? []
					: [
							{
								documentId: proposal.document_id,
								versionId: proposal.source_version_id,
							},
						],
			),
			changes: data.changes,
			overwrite: data.overwrite,
			user: data.user,
			agentRunId: data.agentRunId,
		});
		if (savedRes.error) return savedRes;

		return { error: undefined, data: { id: createdRes.data.id } };
	});

export default openTranslationRequest;
