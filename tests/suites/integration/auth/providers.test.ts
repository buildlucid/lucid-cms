import { randomUUID } from "node:crypto";
import {
	describe,
	expect,
	type Lucid,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { PROVIDERS } from "#shared/config/fragments/auth";
import {
	finishProviderSignIn,
	isSignedIn,
	signInWithProvider,
	startProviderSignIn,
} from "#shared/helpers/auth";

const providers = Object.values(PROVIDERS);

/** A user signed in on `session` who has linked the provider to `subject` from their account. */
const userWithLink = async (lucid: Lucid, provider: string) => {
	const user = await lucid.user();
	const subject = randomUUID();
	const linked = await signInWithProvider(user.session, {
		provider,
		actionType: "authenticated-link",
		identity: { subject },
	});
	expect(linked.searchParams.has("errorMessage")).toBe(false);
	return { ...user, subject };
};

const expectRefused = async (session: Session, sentTo: URL) => {
	expect(sentTo.searchParams.has("errorMessage")).toBe(true);
	expect(await isSignedIn(session)).toBe(false);
};

describe("provider sign-in", () => {
	requires("harness:outbox", "harness:identityProvider");

	test.for(providers)(
		"%s signs in the user who linked it, and nobody else",
		async (provider, { lucid }) => {
			const user = await userWithLink(lucid, provider);

			const stranger = lucid.session();
			await expectRefused(
				stranger,
				await signInWithProvider(stranger, {
					provider,
					identity: { subject: randomUUID() },
				}),
			);

			const visitor = lucid.session();
			const sentTo = await signInWithProvider(visitor, {
				provider,
				identity: { subject: user.subject },
			});
			expect(sentTo.pathname).toBe("/admin");
			const account = await visitor.request<{ data: { id: number } }>({
				path: "/api/v1/account",
			});
			expect(account.body.data.id).toBe(user.id);
		},
	);

	test.for(providers)(
		"%s accepts an invitation, then signs the user in again later",
		async (provider, { lucid }) => {
			const invitation = await lucid.invite();
			const subject = randomUUID();

			const accepting = lucid.session();
			const accepted = await signInWithProvider(accepting, {
				provider,
				actionType: "invitation",
				invitationToken: invitation.token,
				identity: { subject, givenName: "Provided", familyName: "Name" },
			});
			expect(accepted.pathname).toBe("/admin");
			const account = await accepting.request<{
				data: { email: string; firstName: string | null };
			}>({ path: "/api/v1/account" });
			expect(account.body.data.email).toBe(invitation.credentials.email);
			//* the invitation's own name stays, as the admin gave one
			expect(account.body.data.firstName).toBe("Harness");

			const later = lucid.session();
			await signInWithProvider(later, { provider, identity: { subject } });
			expect(await isSignedIn(later)).toBe(true);

			//* the invitation is used up
			const reused = await lucid.session().request({
				method: "POST",
				path: `/api/v1/auth/providers/${provider}/initiate`,
				body: { actionType: "invitation", invitationToken: invitation.token },
			});
			expect(reused.status).toBe(404);
		},
	);

	test("finishes only in the browser that started it, and only once", async ({
		lucid,
	}) => {
		const user = await userWithLink(lucid, PROVIDERS.oauth);
		const signIn = {
			provider: PROVIDERS.oauth,
			identity: { subject: user.subject },
		};
		const browser = lucid.session();
		const callback = await startProviderSignIn(browser, signIn);

		//* another browser, such as a victim sent the link, has no flow cookie for it
		const elsewhere = lucid.session();
		await expectRefused(
			elsewhere,
			await finishProviderSignIn(elsewhere, callback),
		);

		const finished = await finishProviderSignIn(browser, callback);
		expect(finished.pathname).toBe("/admin");
		await browser.request({ method: "POST", path: "/api/v1/auth/logout" });
		await expectRefused(browser, await finishProviderSignIn(browser, callback));
	});

	test("signs nobody in when the provider refuses", async ({ lucid }) => {
		const user = await userWithLink(lucid, PROVIDERS.oauth);
		const visitor = lucid.session();

		const sentTo = await signInWithProvider(visitor, {
			provider: PROVIDERS.oauth,
			identity: { subject: user.subject, error: "access_denied" },
		});
		expect(sentTo.pathname).toBe("/admin/login");
		await expectRefused(visitor, sentTo);
	});

	test("refuses a locked user, and a provider the user has unlinked", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const locked = await userWithLink(lucid, PROVIDERS.oauth);
		await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${locked.id}`,
			body: { isLocked: true },
		});
		const lockedVisitor = lucid.session();
		await expectRefused(
			lockedVisitor,
			await signInWithProvider(lockedVisitor, {
				provider: PROVIDERS.oauth,
				identity: { subject: locked.subject },
			}),
		);

		const unlinked = await userWithLink(lucid, PROVIDERS.oauth);
		const unlink = await unlinked.session.request({
			method: "DELETE",
			path: `/api/v1/account/auth-providers/${PROVIDERS.oauth}`,
		});
		expect(unlink.status).toBe(204);
		const unlinkedVisitor = lucid.session();
		await expectRefused(
			unlinkedVisitor,
			await signInWithProvider(unlinkedVisitor, {
				provider: PROVIDERS.oauth,
				identity: { subject: unlinked.subject },
			}),
		);
	});

	test("won't link one provider account to two users", async ({ lucid }) => {
		const first = await userWithLink(lucid, PROVIDERS.oauth);
		const second = await lucid.user();

		const sentTo = await signInWithProvider(second.session, {
			provider: PROVIDERS.oauth,
			actionType: "authenticated-link",
			identity: { subject: first.subject },
		});
		expect(sentTo.searchParams.has("errorMessage")).toBe(true);

		const visitor = lucid.session();
		await signInWithProvider(visitor, {
			provider: PROVIDERS.oauth,
			identity: { subject: first.subject },
		});
		const account = await visitor.request<{ data: { id: number } }>({
			path: "/api/v1/account",
		});
		expect(account.body.data.id).toBe(first.id);
	});
});
