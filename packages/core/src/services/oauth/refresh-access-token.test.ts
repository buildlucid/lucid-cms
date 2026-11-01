import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { OAuthRefreshTokensRepository } from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { hashOAuthRefreshToken } from "./helpers/security.js";
import issueOAuthTokens from "./issue-tokens.js";
import refreshAccessToken from "./refresh-access-token.js";

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
});

const clientId = "https://client.test/metadata.json";
const resource = "https://cms.test/mcp";

/** Issues a first token pair for a new grant, as an authorization code exchange would. */
const issueFirstTokens = async () => {
	const grant = await context.db.kysely
		.insertInto("lucid_oauth_grants")
		.values({
			name: "Test client",
			client_id: clientId,
			client_name: "Test client",
			principal_type: "system",
		})
		.returning("id")
		.executeTakeFirstOrThrow();

	const tokensRes = await issueOAuthTokens(context, {
		grant: {
			id: grant.id,
			client_id: clientId,
			principal_type: "system",
			user_id: null,
			scopes: [],
		},
		resource,
	});
	if (tokensRes.error) throw new Error("Couldn't issue the first tokens.");
	return tokensRes.data.refresh_token;
};

/** Refreshes as the token endpoint does. */
const refresh = (refreshToken: string) =>
	serviceWrapper(refreshAccessToken, {
		transaction: false,
		defaultError: { type: "authorisation" },
	})(context, { refreshToken, clientId, resource });

test("reusing a rotated refresh token stops the token that replaced it", async () => {
	const first = await issueFirstTokens();
	const rotated = await refresh(first);
	expect(rotated.error).toBeUndefined();

	expect((await refresh(first)).error?.code).toBe("invalid_grant");

	const successor = rotated.data?.refresh_token ?? "";
	expect((await refresh(successor)).error?.code).toBe("invalid_grant");
});

test("a token another request used first counts as reused", async () => {
	const first = await issueFirstTokens();
	//* the other request consumes the token between the lookup and the rotation
	const consume = vi
		.spyOn(OAuthRefreshTokensRepository.prototype, "consume")
		.mockResolvedValueOnce({ error: undefined, data: undefined });

	expect((await refresh(first)).error?.code).toBe("invalid_grant");
	consume.mockRestore();

	const token = await context.db.kysely
		.selectFrom("lucid_oauth_refresh_tokens")
		.select("revoked_at")
		.where("token_hash", "=", hashOAuthRefreshToken(context, first))
		.executeTakeFirstOrThrow();
	expect(token.revoked_at).not.toBeNull();
});
