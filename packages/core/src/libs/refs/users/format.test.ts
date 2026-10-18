import { describe, expect, test } from "vitest";
import type { MediaDeliveryAdapterInstance } from "../../media-delivery/types.js";
import formatUserRefs from "./format.js";
import type { UserRefData } from "./types.js";

const users = [
	{
		id: 9,
		email: "ada@example.com",
		username: "ada",
		first_name: "Ada",
		last_name: "Lovelace",
		created_at: null,
		updated_at: null,
		super_admin: 0,
		invitation_accepted: 1,
		is_locked: 0,
		is_deleted: 0,
		is_deleted_at: null,
	},
] satisfies UserRefData;

const format = (email: boolean) =>
	formatUserRefs(users, {
		host: "https://cms.example.com",
		defaultLocale: "en",
		locales: [{ code: "en" }],
		mediaDelivery: {} as MediaDeliveryAdapterInstance,
		email,
	});

describe("formatUserRefs", () => {
	test("leaves the email out of content API refs, keeping it for the admin", () => {
		expect(format(false)[0]).not.toHaveProperty("email");
		expect(format(true)[0]).toMatchObject({ email: "ada@example.com" });
	});
});
