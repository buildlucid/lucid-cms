import { expect, test } from "vitest";
import {
	matchPermissions,
	requirementPermissions,
} from "./match-permissions.js";
import type { PermissionRequirement } from "./types.js";

const granted = ["media:read", "users:read"];

test.each<[PermissionRequirement, boolean]>([
	["media:read", true],
	["media:update", false],
	[["media:read", "users:read"], true],
	[["media:read", "media:update"], false],
	[{ some: ["media:update", "users:read"] }, true],
	[{ some: [["media:read", "media:update"], "roles:read"] }, false],
	[{ some: [["media:read", "users:read"], "roles:read"] }, true],
])("matches %j as %s", (requirement, expected) => {
	expect(matchPermissions(granted, requirement)).toBe(expected);
});

test("lists every permission a requirement mentions", () => {
	expect(
		requirementPermissions({
			some: [["media:read", "media:update"], "users:read"],
		}),
	).toEqual(["media:read", "media:update", "users:read"]);
});
