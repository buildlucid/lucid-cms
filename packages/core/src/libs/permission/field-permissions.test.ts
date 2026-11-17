import { describe, expect, test } from "vitest";
import defineBrick from "../collection/define-brick.js";
import defineCollection from "../collection/define-collection.js";
import type CollectionDefinition from "../collection/definitions/collection/index.js";
import field from "../collection/definitions/fields/field.js";
import getContentAccess from "../collection/field-access/get-content-access.js";
import type { AccessConfig } from "./capabilities.js";
import { getFieldPermission } from "./field-permissions.js";
import { getPermissionRegistry, isCorePermission } from "./registry.js";

const accessConfig = (collection: CollectionDefinition): AccessConfig => ({
	collections: [collection],
	access: [],
	ai: {
		enabled: false,
		chatTitles: false,
		altGeneration: false,
		mediaGeneration: {
			image: { enabled: false, models: {} },
			audio: { enabled: false, models: {} },
		},
		agents: [],
		mcp: { enabled: false, tools: [], skills: [] },
	},
	deploys: [],
});

describe("field permissions", () => {
	test("builds keys scoped to the collection and brick", () => {
		expect(
			getFieldPermission({ collection: "pages", field: "seo" }, "read"),
		).toBe("documents:pages:fields:seo:read");
		expect(
			getFieldPermission({ collection: "pages", brick: "banner" }, "update"),
		).toBe("documents:pages:bricks:banner:update");
		expect(
			getFieldPermission(
				{ collection: "pages", brick: "banner", field: "cta" },
				"update",
			),
		).toBe("documents:pages:bricks:banner:fields:cta:update");
	});

	test("lists opted-in fields and each brick in the collection's subgroups as core permissions", () => {
		const collection = defineCollection({
			key: "pages",
			mode: "multiple",
			details: { labels: { singular: "Page", plural: "Pages" } },
			bricks: {
				builder: [
					defineBrick({
						key: "banner",
						permissions: { update: true },
						fields: [field.text("cta", { permissions: { read: true } })],
					}),
				],
			},
			fields: [
				field.text("title"),
				field.tab("seo", {
					permissions: { read: true, update: true },
					fields: [],
				}),
			],
		});

		const group = getPermissionRegistry(accessConfig(collection)).find(
			(item) => item.key === "documents:pages",
		);
		//* the action subgroups come first, then field and brick subgroups
		const subgroups = group?.subgroups
			?.filter(
				(subgroup) =>
					subgroup.key === "fields" || subgroup.key.startsWith("bricks:"),
			)
			.map((subgroup) => ({
				key: subgroup.key,
				permissions: subgroup.permissions.map((permission) => permission.key),
			}));

		expect(subgroups).toEqual([
			{
				key: "fields",
				permissions: [
					"documents:pages:fields:seo:read",
					"documents:pages:fields:seo:update",
				],
			},
			{
				key: "bricks:banner",
				permissions: [
					"documents:pages:bricks:banner:update",
					"documents:pages:bricks:banner:fields:cta:read",
				],
			},
		]);
		expect(
			subgroups
				?.flatMap((subgroup) => subgroup.permissions)
				.every(isCorePermission),
		).toBe(true);
	});

	test("adds no field or brick subgroups when nothing opts in", () => {
		const collection = defineCollection({
			key: "pages",
			mode: "multiple",
			details: { labels: { singular: "Page", plural: "Pages" } },
			fields: [field.text("title")],
		});

		const group = getPermissionRegistry(accessConfig(collection)).find(
			(item) => item.key === "documents:pages",
		);

		expect(group?.subgroups?.map((subgroup) => subgroup.key)).toEqual([
			"read",
			"create",
			"update",
			"publish",
			"review",
			"delete",
		]);
	});

	test("locks system-only updates for everyone with an account, without a permission to grant", () => {
		const collection = defineCollection({
			key: "orders",
			mode: "multiple",
			details: { labels: { singular: "Order", plural: "Orders" } },
			fields: [
				field.text("reference", { permissions: { update: "system" } }),
				field.text("note"),
			],
		});

		const superAdmin = getContentAccess(collection, {
			superAdmin: true,
			permissions: undefined,
		});
		expect(superAdmin.fields.get("reference")).toBe("locked");
		expect(superAdmin.fields.get("note")).toBe("editable");
		//* code acting as the system gives no actor
		expect(getContentAccess(collection, undefined).restricted).toBe(false);
		expect(
			getPermissionRegistry(accessConfig(collection))
				.find((item) => item.key === "documents:orders")
				?.subgroups?.map((subgroup) => subgroup.key),
		).not.toContain("fields");
	});

	test("offers no create permissions for collections people can't add to", () => {
		const collection = defineCollection({
			key: "orders",
			mode: "multiple",
			details: { labels: { singular: "Order", plural: "Orders" } },
			actions: { create: false },
			fields: [field.text("reference")],
		});

		expect(
			getPermissionRegistry(accessConfig(collection))
				.find((item) => item.key === "documents:orders")
				?.subgroups?.map((subgroup) => subgroup.key),
		).toEqual(["read", "update", "publish", "review", "delete"]);
	});
});
