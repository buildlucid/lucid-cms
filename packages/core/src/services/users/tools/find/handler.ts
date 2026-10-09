import type z from "zod";
import { getPagination } from "../../../../libs/tools/pagination.js";
import { formatUser } from "../../../../libs/tools/person.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getEligibleReviewers from "../../../requests/helpers/get-eligible-reviewers.js";
import loadToolRequest from "../../../requests/tools/helpers/load-tool-request.js";
import type { RequestToolProps } from "../../../requests/tools/types.js";
import getMultiple from "../../get-multiple.js";
import resolveActorUser from "../../helpers/resolve-actor-user.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Lists users who aren't deleted, showing permitted details and limiting reviewer searches to the tool's collections. */
const findUsers: ServiceFn<
	[
		RequestToolProps & {
			input: z.output<typeof inputSchema>;
			/** Shows permitted account status, except for system MCP integrations that read as super admins. */
			showStatus: boolean;
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { canReview, ...query } = props.input.query;
	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	if (canReview !== undefined) {
		const requestRes = await loadToolRequest(context, {
			id: canReview,
			actor: props.actor,
			allowedCollectionKeys: props.allowedCollectionKeys,
		});
		if (requestRes.error) return requestRes;

		const reviewersRes = await getEligibleReviewers(context, {
			request: requestRes.data.request,
		});
		if (reviewersRes.error) return reviewersRes;

		if (reviewersRes.data.length === 0) {
			return {
				error: undefined,
				data: {
					output: {
						data: [],
						pagination: getPagination(0, query.page, query.perPage),
					},
				},
			};
		}

		//* filterOr groups are ANDed with filter, so every group needs the reviewer IDs
		query.filterOr = (query.filterOr ?? [[]]).map((group) => [
			...group,
			{
				key: "id",
				value: reviewersRes.data.map((reviewer) => reviewer.id),
				operator: "in",
			},
		]);
	}

	const usersRes = await getMultiple(context, {
		query,
		authUser: userRes.data,
	});
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: {
			output: {
				data: usersRes.data.data.map((user) => ({
					...formatUser(user),
					//* the formatter only includes these for people who can manage users
					...(props.showStatus &&
						user.invitationAccepted !== undefined && {
							status: user.isLocked
								? ("locked" as const)
								: user.invitationAccepted
									? ("joined" as const)
									: ("invited" as const),
						}),
				})),
				pagination: getPagination(
					usersRes.data.count,
					query.page,
					query.perPage,
				),
			},
		},
	};
};

export default findUsers;
