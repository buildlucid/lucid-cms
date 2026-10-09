import z from "zod";
import { querySchema as usersQuerySchema } from "../../../../libs/toolkit/users/get-multiple/schema.js";
import {
	filterConditionsInput,
	toQueryFilters,
} from "../../../../libs/tools/filter-conditions.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { userSchema } from "../../../../libs/tools/person.js";

const querySchema = usersQuerySchema.extend({
	page: paginationInput.page,
	perPage: paginationInput.perPage,
	/** Narrows results to people who can approve this request. */
	canReview: z.number().int().positive().optional(),
});
const requestIdSchema = z.coerce.number().int().positive();

export const inputSchema = z.object({
	query: z
		.object({
			filter: filterConditionsInput(
				z.enum(["name", "username", "id", "canReview"]),
			),
			sort: usersQuerySchema.shape.sort,
			page: paginationInput.page,
			perPage: paginationInput.perPage,
		})
		.prefault({})
		.transform(
			({ filter = [], sort, ...query }, ctx): z.input<typeof querySchema> => {
				const [canReview, ...repeated] = filter.filter(
					(condition) => condition.key === "canReview",
				);
				const requestId = canReview
					? requestIdSchema.safeParse(canReview.value)
					: undefined;
				//* only one request and = can be applied, so reject anything else rather than ignore it
				if (
					requestId?.success === false ||
					repeated.length > 0 ||
					(canReview?.operator !== undefined && canReview.operator !== "=")
				) {
					ctx.addIssue({
						code: "custom",
						path: ["filter"],
						message:
							"canReview takes one request ID, once and only with the = operator, eg. {key:'canReview',value:12}.",
					});
				}

				return {
					...query,
					...toQueryFilters([
						...filter.filter((condition) => condition.key !== "canReview"),
						{ key: "isDeleted", value: false, operator: "=" },
					]),
					sort: sort?.length ? sort : [{ key: "firstName", direction: "asc" }],
					canReview: requestId?.data,
				};
			},
		)
		.pipe(querySchema)
		.meta({
			description:
				"All query fields are optional. Use {} to list everyone by first name. filter is a list of conditions combined with AND: include only the conditions you need, eg. {filter:[{key:'name',value:'ada'}]} to search full names and usernames one name at a time, {filter:[{key:'id',value:[1,2]}]} to name the IDs in a user field, or {filter:[{key:'canReview',value:12}]} for people who can approve request 12. perPage max 50.",
		}),
});

export const outputSchema = z.object({
	data: z.array(
		userSchema.extend({
			id: z.number().meta({
				description:
					"User ID for user fields, requests_update reviewers and mentions.",
			}),
			status: z.enum(["joined", "invited", "locked"]).optional().meta({
				description:
					"Whether they have joined, are still invited or are locked out. Only shown to people who can manage users.",
			}),
		}),
	),
	pagination: paginationSchema,
});
