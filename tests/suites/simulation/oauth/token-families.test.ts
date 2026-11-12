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
import { STORY_KEY } from "#shared/config/collections/story";
import {
	callContent,
	connectClient,
	createOAuthClient,
	type OAuthClient,
	refreshTokens,
	revokeToken,
} from "#shared/helpers/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const STORIES_PATH = `documents/${STORY_KEY}?version=latest`;
const MAX_CONNECTIONS = 3;

/** One connection's tokens: every refresh token it was given, oldest first, and the latest access token. */
type Family = {
	refreshTokens: string[];
	accessToken: string;
	live: boolean;
};

type Model = {
	person: Session | null;
	client: OAuthClient | null;
	families: Family[];
};

type Context = SimulationContext<Model>;

const ready = (model: Model) => {
	if (!model.person || !model.client) {
		throw new Error("The sequence's setup didn't run.");
	}
	return { person: model.person, client: model.client };
};

const hasFamilies = (model: Model) => model.families.length > 0;

const connect = action<Model, undefined>({
	name: "connect",
	when: (model) => model.families.length < MAX_CONNECTIONS,
	run: async ({ lucid, model }) => {
		const { person, client } = ready(model);
		const tokens = await connectClient(lucid, {
			person,
			client,
			scope: READ_STORIES,
		});
		model.families.push({
			refreshTokens: [tokens.refresh_token],
			accessToken: tokens.access_token,
			live: true,
		});
	},
});

/**
 * Refreshes with one of a family's refresh tokens. Only the latest works, and only while the
 * family is live. Any older one ends the family, as it may have been stolen.
 */
const refresh = action<Model, { family: number; token: number }>({
	name: "refresh",
	input: fc.record({ family: fc.nat(), token: fc.nat() }),
	when: hasFamilies,
	run: async ({ lucid, model, input }) => {
		const { client } = ready(model);
		const family = pick(model.families, input.family);
		const token = pick(family.refreshTokens, input.token);
		const latest = token === family.refreshTokens.at(-1);

		const answer = await refreshTokens(lucid.session(), {
			client,
			refreshToken: token,
		});

		if (family.live && latest) {
			expect(answer.status).toBe(200);
			family.refreshTokens.push(answer.body.refresh_token);
			family.accessToken = answer.body.access_token;
			return;
		}
		expect(answer.status).toBe(400);
		family.live = false;
	},
});

/** Revokes with any token the family was given, which ends it. */
const revoke = action<
	Model,
	{ family: number; token: number; access: boolean }
>({
	name: "revoke",
	input: fc.record({
		family: fc.nat(),
		token: fc.nat(),
		access: fc.boolean(),
	}),
	when: hasFamilies,
	run: async ({ lucid, model, input }) => {
		const { client } = ready(model);
		const family = pick(model.families, input.family);
		const token = input.access
			? family.accessToken
			: pick(family.refreshTokens, input.token);

		const answer = await revokeToken(lucid.session(), { client, token });

		expect(answer.status).toBe(200);
		family.live = false;
	},
});

const invariants = {
	"a family's latest access token works only while the family is live": async ({
		lucid,
		model,
	}: Context) => {
		const statuses = await Promise.all(
			model.families.map(
				async (family) =>
					(await callContent(lucid, family.accessToken, STORIES_PATH)).status,
			),
		);
		expect(statuses).toEqual(
			model.families.map((family) => (family.live ? 200 : 401)),
		);
	},
	"the person's account lists exactly the live families": async ({
		model,
	}: Context) => {
		const { person } = ready(model);
		const listed = await person.request<{ data: unknown[] }>({
			path: "/api/v1/account/oauth-connections",
		});
		expect(listed.body.data).toHaveLength(
			model.families.filter((family) => family.live).length,
		);
	},
};

describe("OAuth token families", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	simulation(
		"only the latest refresh token works, and anything else ends the connection",
		{
			model: (): Model => ({ person: null, client: null, families: [] }),
			setup: async ({ lucid, admin, model }) => {
				model.person = (
					await lucid.user({ permissions: [READ_STORIES] })
				).session;
				model.client = await createOAuthClient(admin);
			},
			actions: [connect, refresh, revoke],
			invariants,
		},
	);
});
