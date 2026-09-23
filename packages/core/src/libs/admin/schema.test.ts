import { describe, expect, it } from "vitest";
import { adminConfigSchema } from "./schema.js";

const panel = {
	key: "preview",
	component: "./Preview.tsx",
	slot: "brick.end",
};

describe("brick side slots", () => {
	it("accepts either side with a default or explicit column width", () => {
		for (const slot of ["brick.start", "brick.end"]) {
			for (const width of [undefined, 1, 5, 6, 11]) {
				const config = adminConfigSchema.parse({
					slots: [{ ...panel, slot, width, sticky: true }],
				});
				expect(config.slots[0]).toMatchObject({ slot, width, sticky: true });
			}
		}
	});

	it("rejects widths that cannot share the grid with fields", () => {
		for (const width of [0, 12, -1, 4.5, "6"]) {
			const result = adminConfigSchema.safeParse({
				slots: [{ ...panel, width }],
			});
			expect(result.success).toBe(false);
		}
		for (const slot of [
			"brick.beforeFields",
			"brick.afterFields",
			"field.after",
		]) {
			expect(
				adminConfigSchema.safeParse({ slots: [{ ...panel, slot, width: 6 }] })
					.success,
			).toBe(false);
		}
	});

	it("accepts independent panel registrations", () => {
		expect(
			adminConfigSchema.safeParse({
				slots: [
					{ ...panel, match: { brick: "seo" } },
					{ ...panel, key: "second", width: 6, match: { brick: "seo" } },
					{
						...panel,
						key: "other",
						slot: "brick.start",
						width: 4,
						match: { brick: "related" },
					},
				],
			}).success,
		).toBe(true);
	});

	it("accepts overlapping panels for priority-based selection", () => {
		for (const change of [
			{ slot: "brick.start" },
			{ width: 5 },
			{ sticky: true },
		]) {
			const result = adminConfigSchema.safeParse({
				slots: [
					panel,
					{
						...panel,
						...change,
						key: "conflict",
						match: { collection: "pages", brick: "seo" },
					},
				],
			});
			expect(result.success).toBe(true);
		}
	});
});

describe("named component references", () => {
	it("accepts named exports from packages and file URLs", () => {
		for (const module of [
			"@example/plugin/components",
			new URL("file:///tmp/components.tsx"),
		]) {
			const component = { module, export: "Preview" };
			const config = adminConfigSchema.parse({
				slots: [{ ...panel, component }],
				routes: [{ key: "report", path: "report", component }],
			});
			expect(config.slots[0]?.component).toEqual(component);
			expect(config.routes[0]?.component).toEqual(component);
		}
	});
	it("rejects incomplete references and remote modules", () => {
		for (const component of [
			{ module: "./components.ts" },
			{ module: "./components.ts", export: " " },
			{ module: "https://example.com/components.js", export: "Preview" },
			{
				module: new URL("https://example.com/components.js"),
				export: "Preview",
			},
		]) {
			expect(
				adminConfigSchema.safeParse({ slots: [{ ...panel, component }] })
					.success,
			).toBe(false);
		}
	});
});

describe("document list slots", () => {
	it("requires headers for additions and a field target for overrides", () => {
		expect(
			adminConfigSchema.safeParse({
				slots: [
					{
						key: "column",
						slot: "documentList.column",
						component: "./column.tsx",
						column: { label: "Summary" },
						priority: 2,
					},
				],
			}).success,
		).toBe(true);
		for (const slot of [
			{
				key: "column",
				slot: "documentList.column",
				component: "./column.tsx",
			},
			{
				key: "override",
				slot: "field.cell",
				component: "./column.tsx",
				match: { collection: "page" },
			},
			{
				key: "column",
				slot: "documentList.column",
				component: "./column.tsx",
				column: { label: "Summary" },
				priority: Infinity,
			},
		])
			expect(adminConfigSchema.safeParse({ slots: [slot] }).success).toBe(
				false,
			);
	});
});

describe("component options", () => {
	it("accepts JSON and rejects values that cannot be serialised", () => {
		expect(
			adminConfigSchema.safeParse({
				slots: [
					{ ...panel, options: { siteUrl: undefined, limits: [1, null] } },
				],
			}).success,
		).toBe(true);
		for (const value of [() => {}, new Date(), { nested: undefined }]) {
			expect(
				adminConfigSchema.safeParse({
					slots: [{ ...panel, options: { value } }],
				}).success,
			).toBe(false);
		}
	});
});

describe("route permissions", () => {
	const route = { key: "reports", path: "reports", component: "./Page.tsx" };

	it("accepts one key, a list or some options on signed-in routes", () => {
		for (const permission of [
			"media:read",
			["media:read", "users:read"],
			{ some: ["media:read", ["users:read", "roles:read"]] },
		]) {
			expect(
				adminConfigSchema.safeParse({ routes: [{ ...route, permission }] })
					.success,
			).toBe(true);
		}
	});

	it("rejects empty requirements and public routes with permissions", () => {
		for (const permission of [[], { some: [] }, ""]) {
			expect(
				adminConfigSchema.safeParse({ routes: [{ ...route, permission }] })
					.success,
			).toBe(false);
		}
		expect(
			adminConfigSchema.safeParse({
				routes: [
					{
						...route,
						shell: "none",
						access: "public",
						permission: "media:read",
					},
				],
			}).success,
		).toBe(false);
	});
});
