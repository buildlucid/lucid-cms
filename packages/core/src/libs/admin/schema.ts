import { brickSlotKeys, fieldSlotKeys } from "@lucidcms/admin/slots";
import type { AdminConfig, AdminNavigationIcon } from "@lucidcms/admin/types";
import z from "zod";
import { adminCopyInputSchema } from "../i18n/index.js";

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

const brickSlotMatch = z.strictObject({
	collection: key.optional(),
	brick: key.optional(),
	kind: z.enum(["fixed", "builder", "embedded"]).optional(),
});

const navigationIcon = z.enum([
	"dashboard",
	"collection-multiple",
	"collection-single",
	"media",
	"users",
	"overview",
	"roles",
	"email",
	"logout",
	"queue",
	"integrations",
	"settings",
	"release-requests",
	"publishing",
	"extensions",
]) satisfies z.ZodType<AdminNavigationIcon>;
const navigationGroupKey = z
	.string()
	.min(1)
	.max(50)
	.regex(/^[a-z0-9-_]+$/);
const routeNavigation = z.strictObject({
	label: adminCopyInputSchema,
	group: z
		.union([
			navigationGroupKey,
			z.strictObject({
				key: navigationGroupKey,
				label: adminCopyInputSchema.optional(),
				order: z.number().optional(),
			}),
		])
		.optional(),
	order: z.number().optional(),
	icon: navigationIcon.optional(),
});

export const adminConfigSchema = z
	.strictObject({
		slots: z
			.array(
				z.discriminatedUnion("slot", [
					z.strictObject({
						key,
						slot: z.enum(brickSlotKeys),
						match: brickSlotMatch.optional(),
						component: fileReference,
					}),
					z.strictObject({
						key,
						slot: z.enum(fieldSlotKeys),
						match: brickSlotMatch
							.extend({
								field: key.optional(),
								kind: z
									.enum(["fixed", "builder", "embedded", "collection-fields"])
									.optional(),
							})
							.optional(),
						component: fileReference,
					}),
				]),
			)
			.default([]),
		routes: z
			.array(
				z.strictObject({
					key,
					path: routePath,
					component: fileReference,
					navigation: routeNavigation.optional(),
				}),
			)
			.default([]),
		scripts: z.array(assetReference).default([]),
		stylesheets: z.array(assetReference).default([]),
	})
	.default({ slots: [], routes: [], scripts: [], stylesheets: [] })
	.superRefine((config, context) => {
		for (const kind of ["slots", "routes"] as const) {
			const keys = new Set<string>();
			for (const [index, entry] of config[kind].entries()) {
				if (keys.has(entry.key))
					context.addIssue({
						code: "custom",
						path: [kind, index, "key"],
						message: `Duplicate admin ${kind} key "${entry.key}".`,
					});
				keys.add(entry.key);
			}
		}
		const paths = new Set<string>();
		for (const [index, route] of config.routes.entries()) {
			if (paths.has(route.path))
				context.addIssue({
					code: "custom",
					path: ["routes", index, "path"],
					message: `Duplicate admin route path "${route.path}".`,
				});
			paths.add(route.path);
		}
	}) satisfies z.ZodType<Required<AdminConfig>>;
