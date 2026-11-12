import { randomUUID } from "node:crypto";
import {
	action,
	advanceClock,
	describe,
	expect,
	fc,
	pick,
	requires,
	type Session,
	simulation,
	type SimulationContext,
} from "#harness/simulation";
import {
	type AuthenticatorApp,
	addPasskey,
	createAuthenticatorApp,
	enableTwoFactor,
	isSignedIn,
	type Passkey,
	sendLogin,
	signInWithPasskey,
} from "#shared/helpers/auth";

/** How long a login counts as recent for adding a way in. */
const RECENT_MS = 10 * 60_000;
/** Long enough for access tokens to expire, and two of them for a login to stop being recent. */
const WAIT_MS = 6 * 60_000;
const MAX_USERS = 3;
const MAX_SESSIONS = 10;
/** Account two-factor requests per user and sequence. Setups with a KV store allow ten per 15 minutes. */
const MAX_TWO_FACTOR_REQUESTS = 8;

type User = {
	id: number;
	credentials: { username: string; password: string };
	app: AuthenticatorApp | null;
	recoveryCodes: string[];
	usedRecoveryCodes: string[];
	passkeys: Passkey[];
	removedPasskeys: Passkey[];
	locked: boolean;
	/** Whether a role requires two-factor authentication of them. */
	required: boolean;
	twoFactorRequests: number;
};

type SignedIn = {
	userId: number;
	session: Session;
	live: boolean;
	/** When it logged in, which says whether it may add ways in without confirming it's the user. */
	authedAt: number;
};

type Model = {
	users: User[];
	sessions: SignedIn[];
	/** A role that requires two-factor authentication, made the first time it's needed. */
	requiredRoleId: number | null;
};

type Context = SimulationContext<Model>;

/** Required two-factor authentication with nothing to answer it, which ends sessions at their next refresh. */
const needsSetup = (user: User) =>
	user.required && user.app === null && user.passkeys.length === 0;

const userOf = (model: Model, signedIn: SignedIn) => {
	const user = model.users.find(
		(candidate) => candidate.id === signedIn.userId,
	);
	if (!user) {
		throw new Error(`No user ${signedIn.userId} in the model.`);
	}
	return user;
};

const live = (model: Model) => model.sessions.filter((entry) => entry.live);
const hasUsers = (model: Model) => model.users.length > 0;
const hasLive =
	(filter: (user: User, model: Model) => boolean = () => true) =>
	(model: Model) =>
		live(model).some((entry) => filter(userOf(model, entry), model));
const canAddSession = (model: Model) =>
	hasUsers(model) && model.sessions.length < MAX_SESSIONS;

const endSessions = (model: Model, userId: number) => {
	for (const entry of model.sessions) {
		if (entry.userId === userId) {
			entry.live = false;
		}
	}
};

const track = (model: Model, user: User, session: Session) => {
	model.sessions.push({
		userId: user.id,
		session,
		live: true,
		authedAt: Date.now(),
	});
};

/** Invites a user and signs them in, as every sequence starts with two of. */
const addUserTo = async ({ lucid, model }: Context) => {
	const created = await lucid.user();
	const user: User = {
		id: created.id,
		credentials: created.credentials,
		app: null,
		recoveryCodes: [],
		usedRecoveryCodes: [],
		passkeys: [],
		removedPasskeys: [],
		locked: false,
		required: false,
		twoFactorRequests: 0,
	};
	model.users.push(user);
	track(model, user, created.session);
};

const addUser = action<Model>({
	name: "addUser",
	when: (model) => model.users.length < MAX_USERS,
	run: addUserTo,
});

const passwordLogin = action<Model, number>({
	name: "passwordLogin",
	input: fc.nat(),
	when: canAddSession,
	run: async ({ lucid, model, input }) => {
		const user = pick(model.users, input);
		const visitor = lucid.session();
		const login = await sendLogin(visitor, user.credentials);
		if (user.locked) {
			expect(login.status).toBe(401);
			return;
		}

		const step = login.body.data.twoFactor;
		//* a passkey answers required two-factor authentication on its own
		const passkeyAnswers = user.required && user.passkeys.length > 0;
		const expected =
			user.app || passkeyAnswers ? "verify" : needsSetup(user) ? "setup" : null;
		expect(step).toBe(expected);
		//* no session exists until the step passes
		if (step) {
			expect(await isSignedIn(visitor)).toBe(false);
		}

		if (step === "verify" && user.app) {
			const verified = await visitor.request({
				method: "POST",
				path: "/api/v1/auth/two-factor/verify",
				body: { code: await user.app.code() },
			});
			expect(verified.status).toBe(204);
		} else if (step === "verify") {
			const passkey = pick(user.passkeys, input);
			const options = await visitor.request<{ data: { challenge: string } }>({
				method: "POST",
				path: "/api/v1/auth/two-factor/passkey/options",
			});
			const verified = await visitor.request({
				method: "POST",
				path: "/api/v1/auth/two-factor/passkey/verify",
				body: passkey.get(options.body.data.challenge),
			});
			expect(verified.status).toBe(204);
		}
		if (step === "setup") {
			const setup = await visitor.request<{ data: { secret: string } }>({
				method: "POST",
				path: "/api/v1/auth/two-factor/setup",
			});
			const app = createAuthenticatorApp(setup.body.data.secret);
			const confirmed = await visitor.request<{
				data: { recoveryCodes: string[] };
			}>({
				method: "POST",
				path: "/api/v1/auth/two-factor/confirm",
				body: { code: await app.code() },
			});
			expect(confirmed.status).toBe(200);
			user.app = app;
			user.recoveryCodes = confirmed.body.data.recoveryCodes;
		}
		track(model, user, visitor);
	},
});

const recoveryLogin = action<Model, { user: number; code: number }>({
	name: "recoveryLogin",
	input: fc.record({ user: fc.nat(), code: fc.nat() }),
	when: (model) =>
		canAddSession(model) &&
		model.users.some((user) => user.app && !user.locked),
	run: async ({ lucid, model, input }) => {
		const user = pick(
			model.users.filter((candidate) => candidate.app && !candidate.locked),
			input.user,
		);
		const codes = [...user.recoveryCodes, ...user.usedRecoveryCodes];
		const code = pick(codes, input.code);
		const unused = user.recoveryCodes.includes(code);

		const visitor = lucid.session();
		await sendLogin(visitor, user.credentials);
		const verified = await visitor.request({
			method: "POST",
			path: "/api/v1/auth/two-factor/verify",
			body: { recoveryCode: code },
		});
		expect(verified.ok).toBe(unused);
		if (unused) {
			user.recoveryCodes = user.recoveryCodes.filter((item) => item !== code);
			user.usedRecoveryCodes.push(code);
			track(model, user, visitor);
		}
	},
});

const passkeyLogin = action<Model, { user: number; passkey: number }>({
	name: "passkeyLogin",
	input: fc.record({ user: fc.nat(), passkey: fc.nat() }),
	when: (model) =>
		canAddSession(model) &&
		model.users.some(
			(user) => user.passkeys.length + user.removedPasskeys.length > 0,
		),
	run: async ({ lucid, model, input }) => {
		const user = pick(
			model.users.filter(
				(candidate) =>
					candidate.passkeys.length + candidate.removedPasskeys.length > 0,
			),
			input.user,
		);
		const passkey = pick(
			[...user.passkeys, ...user.removedPasskeys],
			input.passkey,
		);
		const works = !user.locked && user.passkeys.includes(passkey);

		const visitor = lucid.session();
		const signedIn = await signInWithPasskey(visitor, passkey);
		expect(signedIn.ok).toBe(works);
		if (works) {
			track(model, user, visitor);
		}
	},
});

/** Picks a live session whose user passes `filter`. */
const pickLive = (
	model: Model,
	index: number,
	filter: (user: User) => boolean = () => true,
) => {
	const entry = pick(
		live(model).filter((candidate) => filter(userOf(model, candidate))),
		index,
	);
	return { entry, user: userOf(model, entry) };
};

const isRecent = (entry: SignedIn) => Date.now() - entry.authedAt <= RECENT_MS;

const turnOnApp = action<Model, number>({
	name: "turnOnApp",
	input: fc.nat(),
	when: hasLive(
		(user) =>
			user.app === null && user.twoFactorRequests < MAX_TWO_FACTOR_REQUESTS,
	),
	run: async ({ model, input }) => {
		const { entry, user } = pickLive(
			model,
			input,
			(candidate) =>
				candidate.app === null &&
				candidate.twoFactorRequests < MAX_TWO_FACTOR_REQUESTS,
		);
		user.twoFactorRequests += 2;
		if (!isRecent(entry)) {
			const refused = await entry.session.request<{ code?: string }>({
				method: "POST",
				path: "/api/v1/account/two-factor/setup",
				body: {},
			});
			expect(refused.body.code).toBe("reauthentication_required");
			return;
		}
		const { app, recoveryCodes } = await enableTwoFactor(entry.session);
		user.app = app;
		user.recoveryCodes = recoveryCodes;
		user.usedRecoveryCodes = [];
	},
});

const turnOffApp = action<Model, number>({
	name: "turnOffApp",
	input: fc.nat(),
	when: hasLive(
		(user) =>
			user.app !== null && user.twoFactorRequests < MAX_TWO_FACTOR_REQUESTS,
	),
	run: async ({ model, input }) => {
		const { entry, user } = pickLive(
			model,
			input,
			(candidate) =>
				candidate.app !== null &&
				candidate.twoFactorRequests < MAX_TWO_FACTOR_REQUESTS,
		);
		user.twoFactorRequests += 1;
		const app = user.app as AuthenticatorApp;
		//* required two-factor authentication stays on unless a passkey answers it
		const allowed = !user.required || user.passkeys.length > 0;

		const disabled = await entry.session.request({
			method: "POST",
			path: "/api/v1/account/two-factor/disable",
			body: { code: await app.code() },
		});
		expect(disabled.ok).toBe(allowed);
		if (allowed) {
			user.app = null;
			user.recoveryCodes = [];
			user.usedRecoveryCodes = [];
		}
	},
});

const addPasskeyAction = action<Model, number>({
	name: "addPasskey",
	input: fc.nat(),
	when: hasLive(),
	run: async ({ lucid, model, input }) => {
		const { entry, user } = pickLive(model, input);
		if (!isRecent(entry)) {
			const refused = await entry.session.request<{ code?: string }>({
				method: "POST",
				path: "/api/v1/account/passkeys/options",
			});
			expect(refused.body.code).toBe("reauthentication_required");
			return;
		}
		user.passkeys.push(await addPasskey(entry.session, lucid.url));
	},
});

const removePasskey = action<Model, { session: number; passkey: number }>({
	name: "removePasskey",
	input: fc.record({ session: fc.nat(), passkey: fc.nat() }),
	when: hasLive((user) => user.passkeys.length > 0),
	run: async ({ model, input }) => {
		const { entry, user } = pickLive(
			model,
			input.session,
			(candidate) => candidate.passkeys.length > 0,
		);
		const passkey = pick(user.passkeys, input.passkey) as Passkey & {
			recordId: number;
		};
		//* the last way to answer required two-factor authentication stays
		const allowed = !(
			user.required &&
			user.app === null &&
			user.passkeys.length === 1
		);

		const removed = await entry.session.request({
			method: "DELETE",
			path: `/api/v1/account/passkeys/${passkey.recordId}`,
		});
		expect(removed.ok).toBe(allowed);
		if (allowed) {
			user.passkeys = user.passkeys.filter((item) => item !== passkey);
			user.removedPasskeys.push(passkey);
		}
	},
});

const setLocked = action<Model, { user: number; locked: boolean }>({
	name: "setLocked",
	input: fc.record({ user: fc.nat(), locked: fc.boolean() }),
	when: hasUsers,
	run: async ({ admin, model, input }) => {
		const user = pick(model.users, input.user);
		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${user.id}`,
			body: { isLocked: input.locked },
		});
		expect(updated.ok).toBe(true);
		user.locked = input.locked;
		if (input.locked) {
			endSessions(model, user.id);
		}
	},
});

const resetTwoFactor = action<Model, number>({
	name: "resetTwoFactor",
	input: fc.nat(),
	when: (model) => model.users.some((user) => user.app),
	run: async ({ admin, model, input }) => {
		const user = pick(
			model.users.filter((candidate) => candidate.app),
			input,
		);
		const reset = await admin.request({
			method: "POST",
			path: `/api/v1/users/${user.id}/reset-two-factor`,
		});
		expect(reset.status).toBe(204);
		user.app = null;
		user.recoveryCodes = [];
		user.usedRecoveryCodes = [];
		endSessions(model, user.id);
	},
});

const resetPasskeys = action<Model, number>({
	name: "resetPasskeys",
	input: fc.nat(),
	when: (model) => model.users.some((user) => user.passkeys.length > 0),
	run: async ({ admin, model, input }) => {
		const user = pick(
			model.users.filter((candidate) => candidate.passkeys.length > 0),
			input,
		);
		const reset = await admin.request({
			method: "DELETE",
			path: `/api/v1/users/${user.id}/passkeys`,
		});
		expect(reset.status).toBe(204);
		user.removedPasskeys.push(...user.passkeys);
		user.passkeys = [];
		endSessions(model, user.id);
	},
});

const requireTwoFactor = action<Model, number>({
	name: "requireTwoFactor",
	input: fc.nat(),
	when: (model) => model.users.some((user) => !user.required),
	run: async ({ admin, model, input }) => {
		const user = pick(
			model.users.filter((candidate) => !candidate.required),
			input,
		);
		if (model.requiredRoleId === null) {
			const role = await admin.request<{ data: { id: number } }>({
				method: "POST",
				path: "/api/v1/roles",
				body: {
					name: `Two-factor ${randomUUID()}`,
					permissions: [],
					requireTwoFactor: true,
				},
			});
			model.requiredRoleId = role.body.data.id;
		}
		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${user.id}`,
			body: { roleIds: [model.requiredRoleId] },
		});
		expect(updated.ok).toBe(true);
		user.required = true;
		//* sessions without two-factor authentication end at their next refresh
		if (needsSetup(user)) {
			endSessions(model, user.id);
		}
	},
});

const logout = action<Model, number>({
	name: "logout",
	input: fc.nat(),
	when: hasLive(),
	run: async ({ model, input }) => {
		const { entry } = pickLive(model, input);
		const loggedOut = await entry.session.request({
			method: "POST",
			path: "/api/v1/auth/logout",
		});
		expect(loggedOut.status).toBe(204);
		entry.live = false;
	},
});

const signOutEverywhere = action<Model, number>({
	name: "signOutEverywhere",
	input: fc.nat(),
	when: hasLive(),
	run: async ({ model, input }) => {
		const { entry, user } = pickLive(model, input);
		const revoked = await entry.session.request({
			method: "POST",
			path: "/api/v1/account/revoke-refresh-tokens",
		});
		expect(revoked.status).toBe(204);
		endSessions(model, user.id);
	},
});

const wait = action<Model>({
	name: "wait",
	run: async () => {
		advanceClock(WAIT_MS);
	},
});

describe("signing in", () => {
	//* the clock only moves in host mode
	requires("harness:outbox", "auth:passkeys", "mode:host");

	simulation<Model>("every session works exactly while it should", {
		model: () => ({ users: [], sessions: [], requiredRoleId: null }),
		setup: async (context) => {
			await addUserTo(context);
			await addUserTo(context);
		},
		actions: [
			addUser,
			passwordLogin,
			recoveryLogin,
			passkeyLogin,
			turnOnApp,
			turnOffApp,
			addPasskeyAction,
			removePasskey,
			setLocked,
			resetTwoFactor,
			resetPasskeys,
			requireTwoFactor,
			logout,
			signOutEverywhere,
			wait,
		],
		maxActions: 25,
		invariants: {
			"a session works and refreshes while it's live, and neither after it ends":
				async ({ model }: Context) => {
					for (const [index, entry] of model.sessions.entries()) {
						const refreshed = await entry.session.request({
							method: "POST",
							path: "/api/v1/auth/token",
						});
						expect(refreshed.ok, `session ${index}`).toBe(entry.live);
						expect(await isSignedIn(entry.session), `session ${index}`).toBe(
							entry.live,
						);
					}
				},
		},
	});
});
