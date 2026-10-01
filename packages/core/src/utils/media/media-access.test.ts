import { describe, expect, test } from "vitest";
import { Permissions } from "../../libs/permission/definitions.js";
import type { LucidUser } from "../../types/hono.js";
import type { MediaOwnership } from "../../types/response.js";
import {
	canAccessMedia,
	getMediaListAccess,
	type MediaAction,
} from "./media-access.js";

const user = (id: number, permissions: string[] = []): LucidUser => ({
	id,
	username: `user-${id}`,
	email: `user-${id}@example.test`,
	superAdmin: false,
	permissions: permissions as LucidUser["permissions"],
});

const owner = user(1);
const other = user(2, [Permissions.MediaRead]);
const auditor = user(3, [Permissions.MediaReadAll]);
const upload: MediaOwnership = { type: "user", userId: owner.id };
const logo: MediaOwnership = { type: "system" };
const actions: MediaAction[] = ["read", "update", "delete"];

const allowed = (actor: LucidUser, ownership: MediaOwnership) =>
	actions.filter((action) =>
		canAccessMedia({ actor: { type: "user", user: actor }, ownership, action }),
	);

describe("media access", () => {
	test("owners manage their personal media, and read-all can only view and delete it", () => {
		expect(allowed(owner, upload)).toEqual(actions);
		expect(allowed(other, upload)).toEqual([]);
		expect(allowed(auditor, upload)).toEqual(["read", "delete"]);
	});

	test("system media is read-only for read-all and changed only by internal code", () => {
		expect(allowed(owner, logo)).toEqual([]);
		expect(allowed(auditor, logo)).toEqual(["read"]);
		expect(
			canAccessMedia({
				actor: { type: "internal" },
				ownership: logo,
				action: "delete",
			}),
		).toBe(true);
	});

	test("the content API only reaches library media", () => {
		for (const ownership of [upload, logo]) {
			expect(
				canAccessMedia({
					actor: { type: "content" },
					ownership,
					action: "read",
				}),
			).toBe(false);
		}
		expect(getMediaListAccess({ type: "content" })).toEqual({
			type: "library",
		});
	});

	test("lists include other users' personal media only with read-all", () => {
		expect(getMediaListAccess({ type: "user", user: other })).toEqual({
			type: "owner",
			userId: other.id,
		});
		expect(getMediaListAccess({ type: "user", user: auditor })).toEqual({
			type: "all",
		});
	});
});
