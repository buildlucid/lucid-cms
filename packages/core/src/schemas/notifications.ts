import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import { notificationLevelSchema } from "../libs/db/tables/notifications.js";
import { agentActorSchema } from "./agent.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { mediaImagePreviewResponseSchema } from "./media.js";

const categorySchema = z.object({
	key: z.string(),
	label: z.string(),
});

const notificationResponseSchema = z.object({
	id: z.number(),
	type: z.string().meta({ example: "requests:review-requested" }),
	category: categorySchema,
	level: notificationLevelSchema,
	actionRequired: z.boolean().meta({
		description: "Stays in to-do lists until resolvedAt is set",
	}),
	title: z.string(),
	body: z.string().nullable(),
	href: z.string().nullable().meta({
		description: "Admin path the notification opens",
		example: "/lucid/requests/12",
	}),
	data: z.record(z.string(), z.unknown()),
	actor: z
		.object({
			id: z.number(),
			email: z.string().nullable(),
			username: z.string().nullable(),
			firstName: z.string().nullable(),
			lastName: z.string().nullable(),
			profilePicture: mediaImagePreviewResponseSchema.nullable(),
		})
		.nullable(),
	actorAgent: agentActorSchema.nullable().meta({
		description: "The agent that acted, for actor or the system",
	}),
	readAt: z.string().nullable(),
	archivedAt: z.string().nullable(),
	resolvedAt: z.string().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
});

const audienceSchema = z.union([
	z.literal("recipients"),
	z.object({
		permission: z.string(),
		roleIds: z.array(z.number()).nullable(),
	}),
]);

const notificationTypeResponseSchema = z.object({
	key: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	category: categorySchema,
	level: notificationLevelSchema,
	actionRequired: z.boolean(),
	required: z.boolean().meta({
		description: "Always delivered in-app. Only its emails can be turned off",
	}),
	audience: audienceSchema,
	enabled: z.boolean(),
	email: z.boolean(),
	defaults: z.object({
		enabled: z.boolean(),
		email: z.boolean(),
	}),
});

const notificationPreferenceResponseSchema = z.object({
	type: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	category: categorySchema,
	emailAvailable: z.boolean().meta({
		description:
			"False when an admin turned the type's emails off for everyone",
	}),
	email: z.boolean(),
});

const noQuery = { string: undefined, formatted: undefined };

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[status]": queryString.schema.filter(false, {
						description:
							"One of inbox, unread, attention or archived. Defaults to inbox",
						example: "unread",
					}),
					"filter[category]": queryString.schema.filter(true, {
						example: "requests",
					}),
					"filter[type]": queryString.schema.filter(true, {
						example: "requests:review-requested",
					}),
					sort: queryString.schema.sort("-updatedAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						status: queryFormatted.schema.filters.single.optional(),
						category: queryFormatted.schema.filters.union.optional(),
						type: queryFormatted.schema.filters.union.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["updatedAt", "createdAt"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(notificationResponseSchema),
	} satisfies ControllerSchema,
	getSummary: {
		body: undefined,
		query: noQuery,
		params: undefined,
		response: z.object({
			unread: z.number(),
			actionRequired: z.number(),
			latestUpdatedAt: z.string().nullable().meta({
				description:
					"When the inbox last changed, so clients can skip refetching",
			}),
		}),
	} satisfies ControllerSchema,
	updateMultiple: {
		body: z
			.object({
				ids: z.array(z.number().int().positive()).optional(),
				all: z.boolean().optional().meta({
					description:
						"Apply to every notification in the inbox, or every archived one when unarchiving",
				}),
				read: z.boolean().optional(),
				archived: z.boolean().optional(),
			})
			.refine((body) => body.all === true || (body.ids?.length ?? 0) > 0, {
				message: "Provide ids or set all to true.",
				path: ["ids"],
			}),
		query: noQuery,
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	getTypes: {
		body: undefined,
		query: noQuery,
		params: undefined,
		response: z.array(notificationTypeResponseSchema),
	} satisfies ControllerSchema,
	updateTypeSettings: {
		body: z.object({
			enabled: z.boolean(),
			email: z.boolean(),
			roleIds: z.array(z.number().int().positive()).nullable().meta({
				description:
					"Roles that receive an audience type. Null sends it to everyone with the permission",
			}),
		}),
		query: noQuery,
		params: z.object({
			type: z.string().meta({ example: "system:storage" }),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	getPreferences: {
		body: undefined,
		query: noQuery,
		params: undefined,
		response: z.array(notificationPreferenceResponseSchema),
	} satisfies ControllerSchema,
	updatePreferences: {
		body: z.object({
			preferences: z
				.array(
					z.object({
						type: z.string(),
						email: z.boolean(),
					}),
				)
				.min(1),
		}),
		query: noQuery,
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
