import { Hono } from "hono";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import constants from "../../../constants/constants.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import generateToken from "./generate-token.js";
import verifyToken from "./verify-token.js";

const state = vi.hoisted(() => ({
	context: undefined as ServiceContext | undefined,
}));
vi.mock("../../../libs/http/utils/create-service-context.js", () => ({
	default: () => state.context,
}));

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

beforeAll(async () => {
	await testConfig.migrate();
	context = createServiceContext({
		config: await testConfig.getConfig(),
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	state.context = context;
});

/** Logs in and refreshes as the auth controllers do. */
const app = new Hono<LucidHonoGeneric>()
	.use(async (c, next) => {
		c.set("config", context.config);
		await next();
	})
	.post("/login/:userId", async (c) => {
		await generateToken(c, Number(c.req.param("userId")), {
			provider: c.req.query("provider") === "true",
		});
		return c.body(null, 204);
	})
	.post("/refresh", async (c) => {
		const sessionRes = await verifyToken(c);
		if (sessionRes.error) return c.body(null, 401);

		await generateToken(c, sessionRes.data.user_id, sessionRes.data);
		return c.body(null, 204);
	});

const createUser = async (username: string) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${username}@test.local`,
			username,
			secret: "test",
			invitation_accepted: true,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return user.id;
};

/** Reads the new refresh cookie, which follows the one clearing the old token. */
const readRefreshCookie = (response: Response) => {
	const cookie = response.headers
		.getSetCookie()
		.findLast((value) =>
			value.startsWith(`${constants.cookies.refreshToken}=`),
		);
	return cookie?.split(";")[0] ?? "";
};

const login = async (userId: number, provider = false) =>
	readRefreshCookie(
		await app.request(`https://cms.test/login/${userId}?provider=${provider}`, {
			method: "POST",
		}),
	);

const refresh = (cookie: string) =>
	app.request("https://cms.test/refresh", {
		method: "POST",
		headers: { Cookie: cookie },
	});

test("a token another refresh used first ends all of the user's sessions", async () => {
	const userId = await createUser("refresh-race");
	const first = await login(userId);
	const otherRes = await refresh(await login(userId));
	expect(otherRes.status).toBe(204);
	const other = readRefreshCookie(otherRes);

	//* the other request uses the token between this one's checks and its rotation
	const consume = vi
		.spyOn(UserTokensRepository.prototype, "consumeRefreshToken")
		.mockResolvedValueOnce({ error: undefined, data: false });
	expect((await refresh(first)).status).toBe(401);
	consume.mockRestore();

	expect((await refresh(first)).status).toBe(401);
	expect((await refresh(other)).status).toBe(401);
});

test("once two-factor is required, sessions without it end at the next refresh, unless they came from a provider", async () => {
	const userId = await createUser("refresh-two-factor");
	const passwordRes = await refresh(await login(userId));
	expect(passwordRes.status).toBe(204);
	const password = readRefreshCookie(passwordRes);
	const provider = await login(userId, true);

	state.context = {
		...context,
		config: {
			...context.config,
			auth: {
				...context.config.auth,
				twoFactor: { ...context.config.auth.twoFactor, required: true },
			},
		},
	};
	try {
		expect((await refresh(password)).status).toBe(401);

		const providerRes = await refresh(provider);
		expect(providerRes.status).toBe(204);
		expect((await refresh(readRefreshCookie(providerRes))).status).toBe(204);
	} finally {
		state.context = context;
	}
});
