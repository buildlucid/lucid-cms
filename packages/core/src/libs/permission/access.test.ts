import { describe, expect, test } from "vitest";
import LucidError from "../../utils/errors/lucid-error.js";
import defineAgent from "../agent/define-agent.js";
import CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { type AccessGroup, accessGroupSchema } from "./access-config.js";
import {
	type AccessConfig,
	getCapabilityRegistry,
	getExternalCapability,
} from "./capabilities.js";
import {
	getGrantablePermissionRegistry,
	getValidPermissions,
	isCorePermission,
} from "./registry.js";
import {
	filterExternalScopes,
	getExternalScopeGroups,
	isCoreExternalScope,
} from "./scopes.js";

const group: AccessGroup = {
	key: "reports",
	name: "Reports",
	permissions: {
		"reports:read": {
			name: "Read reports",
			description: "View reporting data.",
		},
	},
	scopes: {
		"reports:read": { userPermission: "reports:read" },
		"reports:user": {
			userPermission: null,
			name: "Read your reports",
			principalTypes: ["user"],
		},
		"reports:system": {
			userPermission: null,
			name: "Rebuild reports",
			principalTypes: ["system"],
		},
	},
};
const config = (groups: AccessGroup[] = [group]): AccessConfig => ({
	collections: [],
	access: groups.map((value) => accessGroupSchema.parse(value)),
	ai: {
		enabled: true,
		features: {
			imageGeneration: true,
			altGeneration: true,
			customFieldGeneration: true,
			agents: true,
			mcp: false,
		},
		agents: { definitions: [] },
	},
});

test("role grants put content and agents before administration and destructive actions last", () => {
	const resolved = config();
	resolved.collections = [
		new CollectionBuilder("pages", {
			mode: "multiple",
			details: { labels: { singular: "Page", plural: "Pages" } },
		}),
	];
	resolved.ai.agents.definitions = [
		defineAgent({ key: "seo", name: "SEO", description: "SEO", tools: [] }),
	];
	const groups = getGrantablePermissionRegistry(resolved);
	expect(groups.map((value) => value.key)).toEqual([
		"documents:pages",
		"media_permissions",
		"publish_operations_permissions",
		"agents:seo",
		"ai_permissions",
		"users_permissions",
		"roles_permissions",
		"integrations_permissions",
		"emails_permissions",
		"jobs_permissions",
		"settings_permissions",
		"reports",
	]);
	expect(groups[0]?.permissions.map((value) => value.key)).toEqual([
		"documents:pages:read",
		"documents:pages:create",
		"documents:pages:update",
		"documents:pages:restore",
		"documents:pages:review",
		"documents:pages:publish",
		"documents:pages:delete",
	]);
	expect(
		groups
			.find((value) => value.key === "agents:seo")
			?.permissions.map((value) => value.key),
	).toEqual([
		"agents:seo:chat",
		"agents:seo:manage-own-routines",
		"agents:seo:manage-code-routines",
	]);
	expect(isCorePermission("agents:seo:manage-own-routines")).toBe(true);
	expect(getValidPermissions(resolved)).toContain(
		"agents:seo:manage-own-routines",
	);
});

describe("custom access", () => {
	test("uses shared labels without exposing permissions as scopes automatically", () => {
		const resolved = config([
			{
				...group,
				permissions: {
					...group.permissions,
					"reports:manage": { name: "Manage reports" },
				},
			},
		]);
		expect(getValidPermissions(resolved)).toContain("reports:manage");
		expect(getExternalCapability(resolved, "reports:manage")).toBeUndefined();
		const scopes = getExternalScopeGroups(resolved).find(
			(value) => value.key === "reports",
		);
		expect(
			scopes?.scopes.find((value) => value.key === "reports:read")?.details,
		).toEqual({
			name: { type: "lucid.literal", value: "Read reports" },
			description: { type: "lucid.literal", value: "View reporting data." },
		});
		expect(isCoreExternalScope(resolved, "reports:read")).toBe(false);
		expect(isCoreExternalScope(resolved, "media:read")).toBe(true);
	});

	test.each([
		"system",
		"user",
	] as const)("filters unknown, removed and incompatible scopes for %s credentials", (principalType) => {
		const granted = [
			"reports:read",
			"reports:user",
			"reports:system",
			"reports:unknown",
		];
		expect(filterExternalScopes(config(), granted, principalType)).toEqual([
			"reports:read",
			`reports:${principalType}`,
		]);
		expect(filterExternalScopes(config([]), granted, principalType)).toEqual(
			[],
		);
	});

	test("resolves forward permission references and scope label overrides", () => {
		const resolved = config([
			{
				key: "exports",
				name: "Exports",
				scopes: {
					"exports:read": {
						userPermission: "reports:read",
						name: "Read exports",
					},
				},
			},
			group,
		]);
		expect(
			getExternalCapability(resolved, "exports:read")?.userPermission,
		).toBe("reports:read");
		expect(
			getExternalScopeGroups(resolved).find((value) => value.key === "exports")
				?.scopes[0]?.details.name,
		).toEqual({ type: "lucid.literal", value: "Read exports" });
	});

	test.each([
		[{ ...group, key: "account" }],
		[group, group],
		[group, { ...group, key: "duplicate" }],
		[
			{
				key: "bad",
				name: "Bad",
				permissions: { "documents:pages:read": { name: "Read" } },
			},
		],
		[
			{
				key: "bad",
				name: "Bad",
				scopes: { "reports:read": { userPermission: "missing:read" } },
			},
		],
		[
			{
				key: "bad",
				name: "Bad",
				scopes: { "reports:read": { userPermission: null } },
			},
		],
	] satisfies AccessGroup[][])("rejects conflicting or incomplete definitions", (...groups) => {
		expect(() => getCapabilityRegistry(config(groups))).toThrow(LucidError);
	});

	test("includes scope and permission keys in translated configuration errors", () => {
		expect(() =>
			getCapabilityRegistry(
				config([
					{
						key: "reports",
						name: "Reports",
						scopes: { "reports:read": { userPermission: "missing:read" } },
					},
				]),
			),
		).toThrow(
			'Scope "reports:read" refers to an unknown user permission: "missing:read".',
		);
	});

	test("requires an explicit user permission policy and non-empty principal types", () => {
		for (const scope of [
			{ name: "Read" },
			{ name: "Read", userPermission: null, principalTypes: [] },
		]) {
			expect(
				accessGroupSchema.safeParse({
					key: "reports",
					name: "Reports",
					scopes: { "reports:read": scope },
				}).success,
			).toBe(false);
		}
	});
});
