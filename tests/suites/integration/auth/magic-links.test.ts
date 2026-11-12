import { randomUUID } from "node:crypto";
import {
	describe,
	expect,
	type Lucid,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { isSignedIn, linkToken } from "#shared/helpers/auth";

const send = (session: Session, email: string) =>
	session.request({
		method: "POST",
		path: "/api/v1/auth/magic-link",
		body: { email },
	});

const login = (session: Session, body: object) =>
	session.request<{ data: { twoFactor: string | null } }>({
		method: "POST",
		path: "/api/v1/auth/magic-link/login",
		body,
	});

/** Sends a magic link to a new user and returns them with its email. */
const userWithLink = async (lucid: Lucid) => {
	const user = await lucid.user();
	expect((await send(lucid.session(), user.credentials.email)).status).toBe(
		204,
	);
	const email = await lucid.email({
		to: user.credentials.email,
		template: "magic-link",
	});
	return { ...user, email };
};

describe("magic links", () => {
	requires("harness:outbox", "auth:magicLink");

	test("sign in once, and checking the link first doesn't use it up", async ({
		lucid,
	}) => {
		const { credentials, email } = await userWithLink(lucid);
		const token = linkToken(email, "loginLink");

		//* the emailed link opens a page that checks it, so email scanners can't spend it
		for (let check = 0; check < 2; check++) {
			const checked = await lucid
				.session()
				.request<{ data: { email: string } }>({
					path: `/api/v1/auth/magic-link/validate/${token}`,
				});
			expect(checked.body.data.email).toBe(credentials.email);
		}

		const visitor = lucid.session();
		expect((await login(visitor, { token })).status).toBe(200);
		expect(await isSignedIn(visitor)).toBe(true);

		const again = lucid.session();
		expect((await login(again, { token })).ok).toBe(false);
		expect(await isSignedIn(again)).toBe(false);
	});

	test("send a code that only works for the address it was sent to", async ({
		lucid,
	}) => {
		const { credentials, email } = await userWithLink(lucid);
		const other = await lucid.user();
		const code = String(email.data.code);

		const elsewhere = lucid.session();
		expect(
			(await login(elsewhere, { email: other.credentials.email, code })).ok,
		).toBe(false);

		const visitor = lucid.session();
		expect(
			(await login(visitor, { email: credentials.email, code })).status,
		).toBe(200);
		expect(await isSignedIn(visitor)).toBe(true);
	});

	test("answer the same for an address with no account, and send it nothing", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const nobody = `nobody-${randomUUID()}@harness.test`;

		const known = await send(lucid.session(), user.credentials.email);
		const unknown = await send(lucid.session(), nobody);
		expect(unknown.status).toBe(known.status);
		expect(unknown.body).toEqual(known.body);

		await lucid.email({ to: user.credentials.email, template: "magic-link" });
		expect(await lucid.emails({ to: nobody, template: "magic-link" })).toEqual(
			[],
		);
	});
});
