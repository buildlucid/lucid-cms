import { generateSourceHTML } from "@lucidcms/rich-text/server";
import type z from "zod";
import type { RequestEvent } from "../../../../types/response.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getSingle from "../../get-single.js";
import getRequestLink from "../../helpers/get-request-link.js";
import checkCollections from "../helpers/check-collections.js";
import formatUser from "../helpers/format-user.js";
import type { RequestToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Reads request documents, blockers and HTML comment threads, including ownership, permissions and a review token for agents. */
const getRequest: ServiceFn<
	[
		RequestToolProps & {
			input: z.output<typeof inputSchema>;
			/** The agent reading, so it sees which comments it wrote. */
			agentKey?: string;
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { input } = props;
	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const requestRes = await getSingle(context, {
		id: input.requestId,
		user: userRes.data,
	});
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
	const collectionsRes = checkCollections({
		collectionKeys: request.documents.map((document) => document.collectionKey),
		allowedCollectionKeys: props.allowedCollectionKeys,
	});
	if (collectionsRes.error) return collectionsRes;

	const comments = request.events.flatMap((event) =>
		event.type === "comment" ? [event] : [],
	);
	const userId = props.actor.kind === "user" ? props.actor.userId : null;
	const byYou = (entry: Pick<RequestEvent, "user" | "agent">) =>
		props.agentKey !== undefined &&
		entry.agent?.key === props.agentKey &&
		entry.agent.system === (props.actor.kind === "system") &&
		(entry.user?.id ?? null) === userId;
	const documents = new Map(
		request.documents.map((document) => [document.id, document]),
	);

	return {
		error: undefined,
		data: {
			output: {
				data: {
					id: request.id,
					type: request.type,
					title: request.title,
					description:
						request.description && generateSourceHTML(request.description),
					status: request.status,
					approved: request.approved,
					approvals: {
						given: request.approvals.map(
							(approval) => approval.user && formatUser(approval.user),
						),
						required: request.requiredApprovals,
					},
					createdBy: request.createdBy && formatUser(request.createdBy),
					reviewers: request.reviewers.map(formatUser),
					scheduledAt: request.scheduledAt,
					failure: request.failure,
					completedAt: request.completedAt,
					documents: request.documents.map((document) => ({
						collectionKey: document.collectionKey,
						documentId: document.documentId,
						label: document.documentLabel,
						source: document.source,
						deleted: document.deleted,
						workflowStage: document.workflowStage,
						targets: document.targets.map((target) => ({
							target: target.target,
							changes: target.changed,
							changedByOthers: target.changedSinceCreation,
							acknowledged: target.reviewed,
						})),
					})),
					blockers: request.blockers.map((blocker) => {
						const document =
							blocker.requestDocumentId === undefined
								? undefined
								: documents.get(blocker.requestDocumentId);
						return {
							code: blocker.code,
							collectionKey: document?.collectionKey ?? null,
							documentId: document?.documentId ?? null,
							target: blocker.target ?? null,
							message: blocker.message ?? null,
						};
					}),
					comments: comments.map((comment) => ({
						id: comment.id,
						author: comment.user && formatUser(comment.user),
						agent: comment.agent?.name ?? null,
						byYou: byYou(comment),
						body: generateSourceHTML(comment.body),
						createdAt: comment.createdAt,
						resolution: comment.resolution,
						replies: comment.replies.map((reply) => ({
							id: reply.id,
							author: reply.user && formatUser(reply.user),
							agent: reply.agent?.name ?? null,
							byYou: byYou(reply),
							body: generateSourceHTML(reply.body),
							createdAt: reply.createdAt,
						})),
					})),
					...(input.include.includes("activity") && {
						activity: request.events.flatMap((event) => {
							if (event.type === "comment") return [];

							const {
								id: _id,
								agent,
								updatedAt: _updatedAt,
								user,
								...details
							} = event;
							return [
								{
									...details,
									...("body" in details
										? {
												body: details.body && generateSourceHTML(details.body),
											}
										: {}),
									...("reviewer" in details
										? {
												reviewer:
													details.reviewer && formatUser(details.reviewer),
											}
										: {}),
									user: user && formatUser(user),
									agent: agent?.name ?? null,
								},
							];
						}),
					}),
					...(props.agentKey && {
						permissions: {
							edit: request.permissions.edit,
							complete: request.permissions.request,
							reopen: request.permissions.reopen,
						},
						reviewToken: request.reviewToken,
					}),
					links: { request: getRequestLink(context, request.id) },
				},
			},
		},
	};
};

export default getRequest;
