import type {
	AdminConfig,
	AdminNavigationIcon,
	DocumentSidebarSectionKey,
	ValueFieldType,
} from "@lucidcms/admin/types";
import z from "zod";
import { adminCopyInputSchema } from "../i18n/index.js";
import type { Permission } from "../permission/types.js";

const fileReference = z.union([
	z
		.string()
		.trim()
		.min(1)
		.refine(
			(value) =>
				!/^[a-z][a-z\d+.-]*:/i.test(value) || /^[a-z]:[\\/]/i.test(value),
			"Use a file URL object or a local/package path.",
		),
	z
		.instanceof(URL)
		.refine(
			(value) => value.protocol === "file:",
			"Components must use local files or package exports.",
		),
]);

const assetReference = z.union([
	z.url({ protocol: /^https$/ }),
	z.instanceof(URL).refine((value) => value.protocol === "https:"),
	fileReference,
]);

const key = z.string().trim().min(1);

const componentReference = z.union([
	fileReference,
	z.strictObject({ module: fileReference, export: key }),
]);

const options = z.record(z.string(), z.json().optional()).optional();

// Registration is checked against the resolved access config in checkAdminRoutes.
const permission = z.custom<Permission>(
	(value) => typeof value === "string" && value.trim().length > 0,
	"Use a permission key.",
);

const permissionList = z.array(permission).min(1);

const permissionRequirement = z.union([
	permission,
	permissionList,
	z.strictObject({
		some: z.array(z.union([permission, permissionList])).min(1),
	}),
]);

const routePath = z
	.string()
	.trim()
	.transform((value) => value.replace(/^\/+|\/+$/g, ""))
	.pipe(
		z
			.string()
			.regex(
				/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/,
				"Use a static route path such as pages/reports.",
			),
	);

/** What every slot takes, whichever slot it fills. */
const slotBase = {
	key,
	priority: z.number().optional(),
	component: componentReference,
	options,
};

/** Slots shown to signed-in users. Registration is checked against the resolved access config in checkAdminSlots. */
const userSlotBase = {
	...slotBase,
	permission: permissionRequirement.optional(),
};

const brickSlotMatch = z.strictObject({
	collection: key.optional(),
	brick: key.optional(),
	kind: z.enum(["fixed", "builder", "embedded"]).optional(),
});

//* keyed by type, so a field type missing here fails the type check
const fieldSlotType = z.enum({
	text: "text",
	textarea: "textarea",
	"rich-text": "rich-text",
	number: "number",
	range: "range",
	checkbox: "checkbox",
	select: "select",
	color: "color",
	datetime: "datetime",
	json: "json",
	code: "code",
	link: "link",
	media: "media",
	relation: "relation",
	user: "user",
	email: "email",
} satisfies { [Type in ValueFieldType]: Type });

//* keyed by section, so a section missing here fails the type check
const documentSidebarSection = z.enum({
	workflow: "workflow",
	requests: "requests",
	details: "details",
} satisfies { [Section in DocumentSidebarSectionKey]: Section });

const homeWidgetSize = z.enum(["sm", "md", "lg", "full"]);

const homeCard = z
	.strictObject({
		label: adminCopyInputSchema,
		description: adminCopyInputSchema.optional(),
		size: homeWidgetSize.optional(),
		sizes: z.array(homeWidgetSize).min(1).optional(),
		hidden: z.boolean().optional(),
	})
	.refine(
		(card) =>
			card.size === undefined ||
			card.sizes === undefined ||
			card.sizes.includes(card.size),
		{ path: ["size"], message: "Pick a default size from the card's sizes." },
	);

//* keyed by icon, so an icon missing here fails the type check
const navigationIcon = z.enum({
	home: "home",
	agent: "agent",
	chat: "chat",
	history: "history",
	routines: "routines",
	memories: "memories",
	"collection-multiple": "collection-multiple",
	"collection-single": "collection-single",
	media: "media",
	users: "users",
	overview: "overview",
	usage: "usage",
	roles: "roles",
	email: "email",
	logout: "logout",
	queue: "queue",
	integrations: "integrations",
	settings: "settings",
	requests: "requests",
	publishing: "publishing",
	extensions: "extensions",
	notifications: "notifications",
	translations: "translations",
} satisfies { [Icon in AdminNavigationIcon]: Icon });

/** Navigation and maintenance group keys. */
const groupKey = z
	.string()
	.min(1)
	.max(50)
	.regex(/^[a-z0-9-_]+$/);

const routeNavigation = z.strictObject({
	label: adminCopyInputSchema,
	group: z
		.union([
			groupKey,
			z.strictObject({
				key: groupKey,
				label: adminCopyInputSchema.optional(),
				order: z.number().optional(),
			}),
		])
		.optional(),
	order: z.number().optional(),
	icon: navigationIcon.optional(),
});

const route = z.strictObject({
	key,
	path: routePath,
	component: componentReference,
	options,
	navigation: routeNavigation.optional(),
});

export const adminConfigSchema = z
	.strictObject({
		/** Enables the agent chat view on the admin home screen. */
		agentHomescreen: z.boolean().default(true),
		slots: z
			.array(
				z.discriminatedUnion("slot", [
					z.strictObject({
						...userSlotBase,
						slot: z.enum(["agent.widget", "agent.transcriptRow"]),
						match: z.strictObject({
							widget: key,
							version: z.number().int().positive(),
						}),
					}),
					z.strictObject({
						...userSlotBase,
						slot: z.enum([
							"brick.header",
							"brick.beforeFields",
							"brick.afterFields",
						]),
						match: brickSlotMatch.optional(),
					}),
					z.strictObject({
						...userSlotBase,
						slot: z.enum(["brick.start", "brick.end"]),
						width: z.literal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).optional(),
						sticky: z.boolean().optional(),
						match: brickSlotMatch.optional(),
					}),
					z.strictObject({
						...userSlotBase,
						slot: z.enum(["field.input", "field.before", "field.after"]),
						match: brickSlotMatch
							.extend({
								field: key.optional(),
								fieldType: fieldSlotType.optional(),
								kind: z
									.enum(["fixed", "builder", "embedded", "collection-fields"])
									.optional(),
							})
							.optional(),
					}),
					z.strictObject({
						...userSlotBase,
						slot: z.literal("documentList.column"),
						match: z.strictObject({ collection: key.optional() }).optional(),
						column: z.strictObject({ label: adminCopyInputSchema }),
					}),
					z.strictObject({
						...userSlotBase,
						slot: z.literal("field.cell"),
						match: z.strictObject({ collection: key.optional(), field: key }),
					}),
					z.strictObject({
						...userSlotBase,
						slot: z.literal("document.sidebar"),
						match: z.strictObject({ collection: key.optional() }).optional(),
						position: z
							.union([
								z.strictObject({ before: documentSidebarSection }),
								z.strictObject({ after: documentSidebarSection }),
							])
							.optional(),
					}),
					z.strictObject({
						...slotBase,
						slot: z.literal("captcha.widget"),
						match: z.strictObject({ adapter: key.optional() }).optional(),
					}),
					z.strictObject({
						...userSlotBase,
						slot: z.literal("maintenance.action"),
						group: z
							.union([
								groupKey,
								z.strictObject({
									key: groupKey,
									label: adminCopyInputSchema.optional(),
								}),
							])
							.optional(),
					}),
					z.strictObject({
						...userSlotBase,
						slot: z.literal("home.widget"),
						card: homeCard,
					}),
				]),
			)
			.default([]),
		routes: z
			.array(
				z.discriminatedUnion("shell", [
					route.extend({
						shell: z.literal("navigation").default("navigation"),
						access: z.literal("authenticated").default("authenticated"),
						permission: permissionRequirement.optional(),
					}),
					route.extend({
						shell: z.literal("none"),
						access: z
							.enum(["authenticated", "public"])
							.default("authenticated"),
						permission: permissionRequirement.optional(),
					}),
				]),
			)
			.default([]),
		scripts: z.array(assetReference).default([]),
		stylesheets: z.array(assetReference).default([]),
	})
	.default({
		agentHomescreen: true,
		slots: [],
		routes: [],
		scripts: [],
		stylesheets: [],
	})
	.superRefine((config, context) => {
		for (const kind of ["slots", "routes"] as const) {
			const keys = new Set<string>();

			for (const [index, entry] of config[kind].entries()) {
				if (keys.has(entry.key)) {
					context.addIssue({
						code: "custom",
						path: [kind, index, "key"],
						message: `Duplicate admin ${kind} key "${entry.key}".`,
					});
				}

				keys.add(entry.key);
			}
		}

		const paths = new Set<string>();

		for (const [index, route] of config.routes.entries()) {
			if (paths.has(route.path)) {
				context.addIssue({
					code: "custom",
					path: ["routes", index, "path"],
					message: `Duplicate admin route path "${route.path}".`,
				});
			}

			paths.add(route.path);

			if (route.access === "public" && route.permission !== undefined) {
				context.addIssue({
					code: "custom",
					path: ["routes", index, "permission"],
					message: "Public admin routes cannot require permissions.",
				});
			}
		}
	}) satisfies z.ZodType<Required<AdminConfig>>;
