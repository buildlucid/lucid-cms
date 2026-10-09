import type z from "zod";
import { getPagination } from "../../../../libs/tools/pagination.js";
import { formatPerson } from "../../../../libs/tools/person.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getMultiple from "../../get-multiple.js";
import getRequestLink from "../../helpers/get-request-link.js";
import type { RequestToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Lists requests the actor can read within the tool's collections. */
const findRequests: ServiceFn<
	[RequestToolProps & { input: z.output<typeof inputSchema> }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { input } = props;
	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const requestsRes = await getMultiple(context, {
		user: userRes.data,
		collectionKeys: props.allowedCollectionKeys,
		query: input.query,
	});
	if (requestsRes.error) return requestsRes;

	return {
		error: undefined,
		data: {
			output: {
				data: requestsRes.data.data.map((request) => ({
					id: request.id,
					type: request.type,
					title: request.title,
					status: request.status,
					approved: request.approved,
					createdBy: request.createdBy && formatPerson(request.createdBy),
					createdByAgent: request.createdByAgent?.name ?? null,
					reviewers: request.reviewers.map(formatPerson),
					documents: request.documents.map((document) => ({
						collectionKey: document.collectionKey,
						documentId: document.documentId,
						targets: document.targets,
					})),
					scheduledAt: request.scheduledAt,
					failure: request.failure,
					updatedAt: request.updatedAt,
					links: { request: getRequestLink(context, request.id) },
				})),
				pagination: getPagination(
					requestsRes.data.count,
					input.query.page,
					input.query.perPage,
				),
			},
		},
	};
};

export default findRequests;
