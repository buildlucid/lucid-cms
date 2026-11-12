import {
	advanceClock,
	describe,
	expect,
	type Lucid,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { isSignedIn, refreshSession, sendLogin } from "#shared/helpers/auth";

const cookieValue = (session: Session, name: string) =>
	session.cookies().find((cookie) => cookie.name === name)?.value;

/** A new browser holding a copy of another session's refresh token, as a thief would. */
const withRefreshToken = (lucid: Lucid, token: string | undefined) => {
	const copy = lucid.session();
	copy.setCookie({ name: "_refresh", value: token ?? "" });
	return copy;
};

/** Signs the same user in on a second device. */
const signInAgain = async (
	lucid: Lucid,
	credentials: { username: string; password: string },
) => {
	const device = lucid.session();
	const login = await sendLogin(device, credentials);
	expect(login.body.data.twoFactor).toBeNull();
	return device;
};

describe("sessions", () => {
	requires("harness:outbox");

	test("live in cookies scripts can't read, sent only to this site", async ({
		lucid,
	}) => {
		const { credentials } = await lucid.user();
		const login = await sendLogin(lucid.session(), credentials);

		const cookies = login.headers.getSetCookie();
		for (const name of ["_access", "_refresh"]) {
			//* a login clears any cookie it replaces first, so the one it sets comes last
			const cookie = cookies.findLast((value) => value.startsWith(`${name}=`));
			expect(cookie, name).toMatch(/; HttpOnly/i);
			expect(cookie, name).toMatch(/; SameSite=Strict/i);
			expect(cookie, name).toMatch(/; Path=\//i);
			//* the CMS is served over HTTP here, and marks cookies Secure only on HTTPS
			expect(cookie, name).not.toMatch(/; Secure/i);
		}
	});

	test("swap their refresh token on each refresh, and a reused one ends every session", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const otherDevice = await signInAgain(lucid, user.credentials);
		const stolen = cookieValue(user.session, "_refresh");

		expect((await refreshSession(user.session)).ok).toBe(true);
		expect(cookieValue(user.session, "_refresh")).not.toBe(stolen);

		const replayed = await refreshSession(withRefreshToken(lucid, stolen));
		expect(replayed.status).toBe(401);

		//* the user's own refreshed session and their other device end with it
		expect((await refreshSession(user.session)).status).toBe(401);
		expect((await refreshSession(otherDevice)).status).toBe(401);
	});

	test("end on logout, and the refresh token can't be used after", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const token = cookieValue(user.session, "_refresh");

		const logout = await user.session.request({
			method: "POST",
			path: "/api/v1/auth/logout",
		});
		expect(logout.status).toBe(204);
		expect(await isSignedIn(user.session)).toBe(false);
		expect((await refreshSession(withRefreshToken(lucid, token))).status).toBe(
			401,
		);
	});

	test("on other devices end at once when the user signs out everywhere", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const otherDevice = await signInAgain(lucid, user.credentials);

		const revoked = await user.session.request({
			method: "POST",
			path: "/api/v1/account/revoke-refresh-tokens",
		});
		expect(revoked.status).toBe(204);
		expect(await isSignedIn(user.session)).toBe(false);
		//* before its access token expires, as well as at its next refresh
		expect(await isSignedIn(otherDevice)).toBe(false);
		expect((await refreshSession(otherDevice)).status).toBe(401);

		//* a new login works straight after
		expect(await isSignedIn(await signInAgain(lucid, user.credentials))).toBe(
			true,
		);
	});

	test("end at once when an admin locks or deletes the user", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const locked = await lucid.user();
		const deleted = await lucid.user();
		//* a signed-in request first, so setups with a KV store have the user's access cached
		expect(await isSignedIn(locked.session)).toBe(true);
		expect(await isSignedIn(deleted.session)).toBe(true);

		const lock = await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${locked.id}`,
			body: { isLocked: true },
		});
		expect(lock.ok).toBe(true);
		const remove = await admin.request({
			method: "DELETE",
			path: `/api/v1/users/${deleted.id}`,
		});
		expect(remove.ok).toBe(true);

		for (const user of [locked, deleted]) {
			expect(await isSignedIn(user.session)).toBe(false);
			expect((await refreshSession(user.session)).status).toBe(401);
			expect((await sendLogin(lucid.session(), user.credentials)).status).toBe(
				401,
			);
		}
	});
});

describe("sessions over time", () => {
	requires("harness:outbox", "mode:host");

	test("renew their access every few minutes with the refresh token, for a week", async ({
		lucid,
	}) => {
		const user = await lucid.user();

		//* access tokens last five minutes
		advanceClock(6 * 60_000);
		expect(await isSignedIn(user.session)).toBe(false);
		expect((await refreshSession(user.session)).ok).toBe(true);
		expect(await isSignedIn(user.session)).toBe(true);

		//* refresh tokens last seven days
		advanceClock(8 * 24 * 60 * 60_000);
		expect((await refreshSession(user.session)).status).toBe(401);
		expect(await isSignedIn(user.session)).toBe(false);
	});
});
