import {
	action,
	describe,
	expect,
	fc,
	pick,
	requires,
	type Session,
	simulation,
	type SimulationContext,
} from "#harness/simulation";
import { login } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { createApiKey } from "#shared/helpers/integrations";
import {
	authorize,
	callContent,
	connectClient,
	createOAuthClient,
	decide,
	type OAuthClient,
	oauthResources,
	readClaims,
} from "#shared/helpers/oauth";
import { setRolePermissions } from "#shared/helpers/permissions";

const READ_STORIES = `documents:${STORY_KEY}:read`;

/**
 * Scopes the simulation hands out, each with a content API read that needs only it, and the
 * permission a person needs for their own credentials to use it.
 */
const PROBES = {
	[READ_STORIES]: {
		path: `documents/${STORY_KEY}?version=latest`,
		permission: READ_STORIES,
	},
	"media:read": { path: "media", permission: "media:read" },
	//* anyone may read locales
	"locales:read": { path: "locales", permission: null },
} as const;

type Scope = keyof typeof PROBES;

const SCOPES = Object.keys(PROBES) as Scope[];
const PERMISSIONS = [READ_STORIES, "media:read"];
const MAX_PEOPLE = 3;
const MAX_CREDENTIALS = 6;

type Person = {
	id: number;
	roleId: number;
	session: Session;
	credentials: { username: string; password: string };
	/** The permissions their role holds. */
	held: Set<string>;
	locked: boolean;
};

type Kind = "siteKey" | "personalKey" | "personalOAuth" | "siteOAuth";

type Credential = {
	kind: Kind;
	/** The integration's or connection's ID. */
	id: number;
	token: string;
	scopes: Set<Scope>;
	/** Index of the person it acts for, or null for the whole site. */
	owner: number | null;
	live: boolean;
};

type Model = {
	/** A super admin made at the start, who makes site keys and site connections. */
	manager: Session | null;
	client: OAuthClient | null;
	people: Person[];
	credentials: Credential[];
};

type Context = SimulationContext<Model>;

const scopeSet = fc.subarray(SCOPES);
const permissionSet = fc.subarray(PERMISSIONS);

/** Whether the person's permissions let their own credentials use the scope. */
const allows = (person: Person, scope: Scope) => {
	const permission = PROBES[scope].permission;
	return permission === null || person.held.has(permission);
};

const manager = (model: Model) => {
	if (!model.manager || !model.client) {
		throw new Error("The sequence's setup didn't run.");
	}
	return { session: model.manager, client: model.client };
};

const hasRoom = (model: Model) => model.credentials.length < MAX_CREDENTIALS;
const hasActivePerson = (model: Model) =>
	model.people.some((person) => !person.locked);
const activePeople = (model: Model) =>
	model.people.filter((person) => !person.locked);

const addPerson = action<Model, string[]>({
	name: "addPerson",
	input: permissionSet,
	when: (model) => model.people.length < MAX_PEOPLE,
	run: async ({ lucid, model, input }) => {
		const person = await lucid.user({ permissions: input });
		model.people.push({
			id: person.id,
			roleId: person.roleId ?? 0,
			session: person.session,
			credentials: person.credentials,
			held: new Set(input),
			locked: false,
		});
	},
});

const setPermissions = action<Model, { person: number; permissions: string[] }>(
	{
		name: "setPermissions",
		input: fc.record({ person: fc.nat(), permissions: permissionSet }),
		when: (model) => model.people.length > 0,
		run: async ({ admin, model, input }) => {
			const person = pick(model.people, input.person);
			await setRolePermissions(admin, person.roleId, input.permissions);
			person.held = new Set(input.permissions);
		},
	},
);

const toggleLock = action<Model, number>({
	name: "toggleLock",
	input: fc.nat(),
	when: (model) => model.people.length > 0,
	run: async ({ admin, lucid, model, input }) => {
		const person = pick(model.people, input);
		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${person.id}`,
			body: { isLocked: !person.locked },
		});
		expect(updated.status).toBe(204);
		person.locked = !person.locked;
		//* locking ends their sessions, so once unlocked they sign in again
		if (!person.locked) {
			person.session = lucid.session();
			await login(person.session, person.credentials);
		}
	},
});

const createSiteKey = action<Model, Scope[]>({
	name: "createSiteKey",
	input: scopeSet,
	when: hasRoom,
	run: async ({ model, input }) => {
		const { id, apiKey } = await createApiKey(manager(model).session, "site", {
			scopes: input,
		});
		model.credentials.push({
			kind: "siteKey",
			id,
			token: apiKey,
			scopes: new Set(input),
			owner: null,
			live: true,
		});
	},
});

const createPersonalKey = action<Model, { person: number; scopes: Scope[] }>({
	name: "createPersonalKey",
	input: fc.record({ person: fc.nat(), scopes: scopeSet }),
	when: (model) => hasRoom(model) && hasActivePerson(model),
	run: async ({ model, input }) => {
		const person = pick(activePeople(model), input.person);
		//* a key can only hold scopes its owner holds when it's made
		const scopes = input.scopes.filter((scope) => allows(person, scope));
		const { id, apiKey } = await createApiKey(person.session, "personal", {
			scopes,
		});
		model.credentials.push({
			kind: "personalKey",
			id,
			token: apiKey,
			scopes: new Set(scopes),
			owner: model.people.indexOf(person),
			live: true,
		});
	},
});

const connectPerson = action<Model, { person: number; scopes: Scope[] }>({
	name: "connectPerson",
	input: fc.record({
		person: fc.nat(),
		scopes: fc.subarray(SCOPES, { minLength: 1 }),
	}),
	when: (model) => hasRoom(model) && hasActivePerson(model),
	run: async ({ lucid, model, input }) => {
		const person = pick(activePeople(model), input.person);
		const { client } = manager(model);
		const granted = input.scopes.filter((scope) => allows(person, scope));
		if (granted.length === 0) {
			//* nothing the person could give, so consent is refused
			const started = await authorize(person.session, {
				client,
				scope: input.scopes.join(" "),
				resource: (await oauthResources(lucid)).content,
			});
			const refused = await decide(person.session, started.requestId ?? "", {
				decision: "allow",
				principalType: "user",
			});
			expect(refused.status).toBe(403);
			return;
		}
		const tokens = await connectClient(lucid, {
			person: person.session,
			client,
			scope: input.scopes.join(" "),
		});
		expect(tokens.scope.split(" ").toSorted()).toEqual(granted.toSorted());
		model.credentials.push({
			kind: "personalOAuth",
			id: readClaims(tokens.access_token).grant_id,
			token: tokens.access_token,
			scopes: new Set(granted),
			owner: model.people.indexOf(person),
			live: true,
		});
	},
});

const connectSite = action<Model, Scope[]>({
	name: "connectSite",
	input: fc.subarray(SCOPES, { minLength: 1 }),
	when: hasRoom,
	run: async ({ lucid, model, input }) => {
		const { session, client } = manager(model);
		const tokens = await connectClient(lucid, {
			person: session,
			client,
			scope: input.join(" "),
			principalType: "system",
		});
		model.credentials.push({
			kind: "siteOAuth",
			id: readClaims(tokens.access_token).grant_id,
			token: tokens.access_token,
			scopes: new Set(input),
			owner: null,
			live: true,
		});
	},
});

/** Ends a credential as an admin would: disabling a key, or revoking a connection. */
const endCredential = action<Model, number>({
	name: "endCredential",
	input: fc.nat(),
	when: (model) => model.credentials.some((credential) => credential.live),
	run: async ({ admin, model, input }) => {
		const credential = pick(
			model.credentials.filter((item) => item.live),
			input,
		);
		const owner =
			credential.owner === null ? null : model.people[credential.owner];
		const path = {
			siteKey: `/api/v1/integrations/${credential.id}`,
			personalKey: `/api/v1/users/${owner?.id}/integrations/${credential.id}`,
			personalOAuth: `/api/v1/users/${owner?.id}/oauth-connections/${credential.id}`,
			siteOAuth: `/api/v1/integrations/oauth/${credential.id}`,
		}[credential.kind];
		const ended = credential.kind.endsWith("Key")
			? await admin.request({ method: "PATCH", path, body: { enabled: false } })
			: await admin.request({ method: "DELETE", path });
		expect(ended.status, `${credential.kind} ${path}`).toBe(204);
		credential.live = false;
	},
});

/** Gives a key a new secret, which leaves the old one dead. */
const regenerateKey = action<Model, number>({
	name: "regenerateKey",
	input: fc.nat(),
	when: (model) =>
		hasRoom(model) &&
		model.credentials.some(
			(credential) => credential.live && credential.kind === "siteKey",
		),
	run: async ({ model, input }) => {
		const credential = pick(
			model.credentials.filter((item) => item.live && item.kind === "siteKey"),
			input,
		);
		const regenerated = await manager(model).session.request<{
			data: { apiKey: string };
		}>({
			method: "POST",
			path: `/api/v1/integrations/${credential.id}/regenerate-keys`,
		});
		expect(regenerated.status).toBe(200);
		credential.live = false;
		model.credentials.push({
			...credential,
			token: regenerated.body.data.apiKey,
			live: true,
		});
	},
});

/** The status a credential should get for a read that needs the scope. */
const expectedStatus = (model: Model, credential: Credential, scope: Scope) => {
	const owner =
		credential.owner === null ? null : model.people[credential.owner];
	if (!credential.live || owner?.locked) {
		return 401;
	}
	const allowed =
		credential.scopes.has(scope) && (owner ? allows(owner, scope) : true);
	return allowed ? 200 : 403;
};

const invariants = {
	"every credential reads exactly what its scopes and owner allow": async ({
		lucid,
		model,
	}: Context) => {
		for (const [index, credential] of model.credentials.entries()) {
			const statuses = Object.fromEntries(
				await Promise.all(
					SCOPES.map(
						async (scope) =>
							[
								scope,
								(await callContent(lucid, credential.token, PROBES[scope].path))
									.status,
							] as const,
					),
				),
			);
			const expected = Object.fromEntries(
				SCOPES.map((scope) => [
					scope,
					expectedStatus(model, credential, scope),
				]),
			);
			expect(statuses, `credential ${index} (${credential.kind})`).toEqual(
				expected,
			);
		}
	},
};

describe("external access model", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	simulation(
		"keys and OAuth connections read exactly what they should, after any change",
		{
			model: (): Model => ({
				manager: null,
				client: null,
				people: [],
				credentials: [],
			}),
			setup: async ({ lucid, admin, model }) => {
				model.manager = (await lucid.user({ superAdmin: true })).session;
				model.client = await createOAuthClient(admin);
			},
			actions: [
				addPerson,
				setPermissions,
				toggleLock,
				createSiteKey,
				createPersonalKey,
				connectPerson,
				connectSite,
				endCredential,
				regenerateKey,
			],
			invariants,
		},
	);
});
