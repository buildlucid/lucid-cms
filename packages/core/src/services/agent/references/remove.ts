import { copy } from "../../../libs/i18n/index.js";
import {
	AgentDeployReferencesRepository,
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
	AgentRequestReferencesRepository,
} from "../../../libs/repositories/index.js";
import type { AgentReferenceSource } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Unlinks a resource from a chat. Messages keep what was attached, but tools can
 * no longer list or open it through the chat. `source` limits removal to links
 * made that way. Managed links are refused, as only the toolkit can unlink
 * them. Removing a missing link succeeds.
 */
const remove: ServiceFn<
	[
		{
			conversationId: string;
			referenceId: string;
			source?: AgentReferenceSource["type"];
		},
	],
	undefined
> = async (context, input) => {
	const Media = new AgentMediaReferencesRepository(context.db);
	const Documents = new AgentDocumentReferencesRepository(context.db);
	const Requests = new AgentRequestReferencesRepository(context.db);
	const Deploys = new AgentDeployReferencesRepository(context.db);

	//* the ID is unique across the tables, so the missing rows are a no-op
	const where = [
		{ key: "id", operator: "=", value: input.referenceId },
		{ key: "conversation_id", operator: "=", value: input.conversationId },
	] satisfies Parameters<
		AgentMediaReferencesRepository["deleteMultiple"]
	>[0]["where"];

	const [mediaLink, documentLink, requestLink, deployLink] = await Promise.all([
		Media.selectSingle({ select: ["managed"], where }),
		Documents.selectSingle({ select: ["managed"], where }),
		Requests.selectSingle({ select: ["managed"], where }),
		Deploys.selectSingle({ select: ["managed"], where }),
	]);
	if (mediaLink.error) return mediaLink;
	if (documentLink.error) return documentLink;
	if (requestLink.error) return requestLink;
	if (deployLink.error) return deployLink;
	if (
		mediaLink.data?.managed ||
		documentLink.data?.managed ||
		requestLink.data?.managed ||
		deployLink.data?.managed
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.references.managed"),
			},
		};
	}

	//* still limited to unmanaged links, as a tool may take this one over after the check
	const deletion = {
		where: [
			...where,
			{ key: "managed", operator: "=", value: false },
			...(input.source
				? [{ key: "source", operator: "=", value: input.source } as const]
				: []),
		],
	} satisfies Parameters<AgentMediaReferencesRepository["deleteMultiple"]>[0];

	const [media, documents, requests, deploys] = await Promise.all([
		Media.deleteMultiple(deletion),
		Documents.deleteMultiple(deletion),
		Requests.deleteMultiple(deletion),
		Deploys.deleteMultiple(deletion),
	]);
	if (media.error) return media;
	if (documents.error) return documents;
	if (requests.error) return requests;
	if (deploys.error) return deploys;

	return { error: undefined, data: undefined };
};

export default remove;
