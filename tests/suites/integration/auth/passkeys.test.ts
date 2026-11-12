import { describe, expect, requires, test } from "#harness/vitest";
import {
	addPasskey,
	createPasskey,
	isSignedIn,
	refreshSession,
	type RegistrationOptions,
	signInWithPasskey,
} from "#shared/helpers/auth";

describe("passkeys", () => {
	requires("harness:outbox", "auth:passkeys");

	test("sign in once added from the account, until they're removed", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const passkey = await addPasskey(user.session, lucid.url);

		const visitor = lucid.session();
		expect((await signInWithPasskey(visitor, passkey)).status).toBe(204);
		const account = await visitor.request<{ data: { id: number } }>({
			path: "/api/v1/account",
		});
		expect(account.body.data.id).toBe(user.id);

		const removed = await user.session.request({
			method: "DELETE",
			path: `/api/v1/account/passkeys/${passkey.recordId}`,
		});
		expect(removed.status).toBe(204);
		const after = lucid.session();
		expect((await signInWithPasskey(after, passkey)).ok).toBe(false);
		expect(await isSignedIn(after)).toBe(false);
	});

	test("are only made for this site", async ({ lucid }) => {
		const user = await lucid.user();
		const options = await user.session.request<{ data: RegistrationOptions }>({
			method: "POST",
			path: "/api/v1/account/passkeys/options",
		});

		//* a page on another site asking the browser for a passkey gets one bound to that site
		const added = await user.session.request({
			method: "POST",
			path: "/api/v1/account/passkeys",
			body: createPasskey(lucid.url).create(options.body.data, {
				origin: "https://elsewhere.test",
			}),
		});
		expect(added.status).toBe(400);
	});

	test("are all removed by an admin's reset, which also ends the user's sessions", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const user = await lucid.user();
		const passkey = await addPasskey(user.session, lucid.url);

		const reset = await admin.request({
			method: "DELETE",
			path: `/api/v1/users/${user.id}/passkeys`,
		});
		expect(reset.status).toBe(204);
		expect((await refreshSession(user.session)).status).toBe(401);
		expect((await signInWithPasskey(lucid.session(), passkey)).ok).toBe(false);
	});

	test("can accept an invitation instead of a password", async ({ lucid }) => {
		const invitation = await lucid.invite();
		const visitor = lucid.session();
		const passkey = createPasskey(lucid.url);

		const options = await visitor.request<{ data: RegistrationOptions }>({
			method: "POST",
			path: `/api/v1/auth/invitation/accept/${invitation.token}/passkey/options`,
		});
		expect(options.status).toBe(200);
		const accepted = await visitor.request({
			method: "POST",
			path: `/api/v1/auth/invitation/accept/${invitation.token}/passkey`,
			body: passkey.create(options.body.data),
		});
		expect(accepted.status).toBe(204);
		expect(await isSignedIn(visitor)).toBe(true);

		const later = lucid.session();
		expect((await signInWithPasskey(later, passkey)).status).toBe(204);

		const reused = await lucid.session().request({
			method: "POST",
			path: `/api/v1/auth/invitation/accept/${invitation.token}/passkey/options`,
		});
		expect(reused.ok).toBe(false);
	});
});
