import { randomUUID } from "node:crypto";
import {
	advanceClock,
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { addPasskey, enableTwoFactor } from "#shared/auth";
import { PROVIDERS } from "#shared/fragments/auth";

/** Longer than the ten minutes a login counts as recent for. */
const LATER = 11 * 60_000;

type Change = {
	method: "POST" | "PATCH";
	path: string;
	body?: unknown;
};

/** Each change that adds a way into the account, or acts as it, as a stolen session would want. */
const GATED: Record<string, Change> = {
	"adding a passkey": {
		method: "POST",
		path: "/api/v1/account/passkeys/options",
	},
	"setting up an authenticator app": {
		method: "POST",
		path: "/api/v1/account/two-factor/setup",
		body: {},
	},
	"linking a provider": {
		method: "POST",
		path: `/api/v1/auth/providers/${PROVIDERS.oauth}/initiate`,
		body: { actionType: "authenticated-link" },
	},
	"changing the email": {
		method: "PATCH",
		path: "/api/v1/account",
		body: { email: `changed-${randomUUID()}@harness.test` },
	},
	"making a personal API key": {
		method: "POST",
		path: "/api/v1/account/integrations",
		body: {},
	},
	"making a system API key": {
		method: "POST",
		path: "/api/v1/integrations",
		body: {},
	},
};

/** The changes the CMS refuses until the user confirms it's them. */
const refusedChanges = async (session: Session) => {
	const refused: string[] = [];
	for (const [name, change] of Object.entries(GATED)) {
		const response = await session.request<{ code?: string }>(change);
		if (response.body?.code === "reauthentication_required") {
			refused.push(name);
		}
	}
	return refused;
};

/** Lets the login grow old. Refreshing keeps the session, but not how recent its login was. */
const ageLogin = async (session: Session) => {
	advanceClock(LATER);
	const refreshed = await session.request({
		method: "POST",
		path: "/api/v1/auth/token",
	});
	expect(refreshed.ok).toBe(true);
};

const reauthenticate = (session: Session, body: object) =>
	session.request({
		method: "POST",
		path: "/api/v1/account/reauthenticate",
		body,
	});

describe("confirming it's you", () => {
	requires("harness:outbox", "mode:host");

	test("is needed ten minutes after logging in, for every change that adds a way in", async ({
		lucid,
	}) => {
		const { session } = await lucid.user({ superAdmin: true });
		expect(await refusedChanges(session)).toEqual([]);

		await ageLogin(session);
		expect(await refusedChanges(session)).toEqual(Object.keys(GATED));
	});

	test("takes the password, an authenticator code or a passkey, and nothing wrong", async ({
		lucid,
	}) => {
		const user = await lucid.user({ superAdmin: true });
		const { app } = await enableTwoFactor(user.session);
		const passkey = await addPasskey(user.session, lucid.url);
		//* replacing an app takes a code from the current one instead
		const gated = Object.keys(GATED).filter(
			(name) => name !== "setting up an authenticator app",
		);

		await ageLogin(user.session);
		const wrong = await reauthenticate(user.session, {
			password: "not-the-password",
		});
		expect(wrong.status).toBe(400);
		expect(await refusedChanges(user.session)).toEqual(gated);

		const proofs: Record<string, () => Promise<object>> = {
			password: async () => ({ password: user.credentials.password }),
			code: async () => ({ code: await app.code() }),
			passkey: async () => {
				const options = await user.session.request<{
					data: { challenge: string };
				}>({ method: "POST", path: "/api/v1/account/reauthenticate/options" });
				return { passkey: passkey.get(options.body.data.challenge) };
			},
		};
		for (const [name, proof] of Object.entries(proofs)) {
			await ageLogin(user.session);
			const confirmed = await reauthenticate(user.session, await proof());
			expect(confirmed.status, name).toBe(204);
			expect(await refusedChanges(user.session), name).toEqual([]);
		}
	});
});
