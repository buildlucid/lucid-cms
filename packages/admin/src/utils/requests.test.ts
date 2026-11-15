import type { Collection, Permission, User } from "@types";
import { afterEach, describe, expect, test } from "vitest";
import userStore from "@/store/userStore/userStore";
import {
	canTakePartInRequests,
	getAllowedTargets,
	getChangeModes,
} from "./requests";

const collection = {
	publishing: {
		environments: [{ key: "staging" }, { key: "production" }],
	},
};

describe("getAllowedTargets", () => {
	test("latest publishes to every environment; environments move forward", () => {
		expect(getAllowedTargets(collection, "latest")).toEqual([
			"staging",
			"production",
		]);
		expect(getAllowedTargets(collection, "staging")).toEqual(["production"]);
		expect(getAllowedTargets(collection, "production")).toEqual([]);
		expect(getAllowedTargets(collection, "proposal")).toEqual([]);
	});
});

describe("getChangeModes", () => {
	test("changes other versions straight away, and anyone who can change latest can propose it", () => {
		expect(getChangeModes()).toEqual(["now"]);
		expect(getChangeModes(null)).toEqual([]);
		expect(getChangeModes("direct")).toEqual(["now", "request"]);
		expect(getChangeModes("request")).toEqual(["request"]);
	});
});

describe("canTakePartInRequests", () => {
	afterEach(() => userStore.get.reset());
	//* only permissions matter to these checks, so the rest of the user and collection are left out
	const signIn = (permissions: Permission[]) =>
		userStore.set("user", { superAdmin: false, permissions } as User);
	const pages = {
		permissions: {
			read: "documents:pages:read",
			create: "documents:pages:create",
			createRequest: "documents:pages:create-request",
			update: "documents:pages:update",
			updateRequest: "documents:pages:update-request",
			delete: "documents:pages:delete",
			deleteRequest: "documents:pages:delete-request",
			restore: "documents:pages:restore",
			publish: "documents:pages:publish",
			publishRequest: "documents:pages:publish-request",
			review: "documents:pages:review",
		},
	} satisfies Pick<Collection, "permissions">;

	test("needs read on a collection they can make, review or complete requests in, or requests:read", () => {
		signIn(["documents:pages:read"]);
		expect(canTakePartInRequests([pages])).toBe(false);
		signIn(["documents:pages:create-request"]);
		expect(canTakePartInRequests([pages])).toBe(false);
		signIn(["documents:pages:read", "documents:pages:create-request"]);
		expect(canTakePartInRequests([pages])).toBe(true);
		signIn(["requests:read"]);
		expect(canTakePartInRequests([])).toBe(true);
	});
});
