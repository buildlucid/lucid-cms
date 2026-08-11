import { expect, test } from "vitest";
import type { LucidAuth } from "../../../types/hono.js";
import resolveRichTextVariableAccess from "./resolve-rich-text-variable-access.js";

const authUser = (props: {
	permissions?: LucidAuth["permissions"];
	superAdmin?: boolean;
}): LucidAuth => ({
	id: 1,
	username: "editor",
	email: "editor@example.com",
	superAdmin: props.superAdmin ?? false,
	permissions: props.permissions,
	exp: 0,
	iat: 0,
	nonce: "test",
});

test("resolves readable variable resources from the editor permissions", () => {
	expect(
		resolveRichTextVariableAccess({
			collectionKeys: ["settings", "pages"],
			user: authUser({
				permissions: ["documents:settings:read", "users:read"],
			}),
		}),
	).toEqual({
		documentCollectionKeys: ["settings"],
		users: true,
	});
});

test("grants every variable resource to super admins", () => {
	expect(
		resolveRichTextVariableAccess({
			collectionKeys: ["settings", "pages"],
			user: authUser({ superAdmin: true }),
		}),
	).toEqual({
		documentCollectionKeys: ["settings", "pages"],
		users: true,
	});
});
