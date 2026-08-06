import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import testingConstants from "../../constants/testing-constants.js";
import createLucidDatabase from "../../libs/db/create-lucid-database.js";
import type {
	ConnectionGrant,
	ConnectionRegistration,
	RemoteConnectionData,
} from "../../libs/lucid-remote/types.js";
import { AiGenerationsRepository } from "../../libs/repositories/index.js";
import type { Config } from "../../types/config.js";
import type { ServiceContext } from "../../utils/services/types.js";
import callback from "./callback.js";
import connect from "./connect.js";
import disconnect from "./disconnect.js";
import {
	getConnectionGrant,
	getConnectionRegistration,
	persistConnectionGrantState,
	replaceConnectionRegistration,
	resolveEffectiveConnection,
	resolveWritableConnection,
} from "./storage.js";
import getAccessToken from "./token-manager.js";

const issuer = "https://api.lucid.test";
const resource = `${issuer}/v1/cms`;
const callbackUrl = "https://cms.example.test/lucid/api/v1/connection/callback";
const browserBinding = "browser-binding".repeat(4);
const now = () => Math.floor(Date.now() / 1000);

const registration: ConnectionRegistration = {
	clientId: "registered-client",
	clientSecret: "registered-secret",
	clientSecretExpiresAt: 0,
	redirectUri: callbackUrl,
	issuer,
	resource,
};

const grant = (overrides: Partial<ConnectionGrant> = {}): ConnectionGrant => ({
	accessToken: "access-token",
	refreshToken: "refresh-token",
	accessTokenExpiresAt: now() + 900,
	issuer,
	resource,
	...overrides,
});

const remoteConnection: RemoteConnectionData = {
	connection: {
		id: "connection-1",
		name: "Example CMS",
		status: "active",
		clientName: "Example CMS",
		clientOrigin: "https://cms.example.test",
	},
	organisation: {
		id: "organisation-1",
		name: "Example Organisation",
	},
	scope: "cms:ai",
	resource,
};

const adapter = new SQLiteAdapter({ database: ":memory:" });
const database = await adapter.connect();
await adapter.migrateCoreToLatest(database);
const lucidDatabase = createLucidDatabase({
	client: database.client,
	adapter,
});

const makeConfig = (): Config =>
	// @ts-expect-error
	({
		db: adapter,
		tables: [],
		host: "https://cms.example.test",
		secrets: {
			encryption: testingConstants.key,
			cookie: testingConstants.key,
			accessToken: testingConstants.key,
			refreshToken: testingConstants.key,
		},
		brand: { name: "Example CMS" },
	}) as Config;

const makeContext = (): ServiceContext =>
	// @ts-expect-error
	({
		db: lucidDatabase,
		config: makeConfig(),
		env: {
			LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE: issuer,
		},
		request: {
			url: "https://cms.example.test/lucid/api/v1/connection/status",
			locale: "en",
		},
	}) as ServiceContext;

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const installOAuthFetch = () => {
	const fetchMock = vi.fn<typeof fetch>(async (input) => {
		const url = new URL(String(input));

		switch (url.pathname) {
			case "/.well-known/oauth-authorization-server":
				return jsonResponse({
					issuer,
					authorization_endpoint: `${issuer}/oauth/authorize`,
					token_endpoint: `${issuer}/v1/oauth/token`,
					registration_endpoint: `${issuer}/v1/oauth/register`,
					revocation_endpoint: `${issuer}/v1/oauth/revoke`,
					scopes_supported: ["cms:ai"],
					response_types_supported: ["code"],
					grant_types_supported: ["authorization_code", "refresh_token"],
					token_endpoint_auth_methods_supported: ["client_secret_basic"],
					code_challenge_methods_supported: ["S256"],
					authorization_response_iss_parameter_supported: true,
					protected_resources: [resource],
				});
			case "/.well-known/oauth-protected-resource/v1/cms":
				return jsonResponse({
					resource,
					authorization_servers: [issuer],
					scopes_supported: ["cms:ai"],
				});
			case "/v1/oauth/register":
				return jsonResponse({
					client_id: registration.clientId,
					client_secret: registration.clientSecret,
					client_secret_expires_at: 0,
					redirect_uris: [callbackUrl],
					token_endpoint_auth_method: "client_secret_basic",
					grant_types: ["authorization_code", "refresh_token"],
					response_types: ["code"],
					client_name: "Example CMS",
					application_type: "web",
				});
			case "/v1/oauth/token":
				return jsonResponse({
					access_token: "exchanged-access-token",
					token_type: "Bearer",
					expires_in: 900,
					refresh_token: "exchanged-refresh-token",
					scope: "cms:ai",
					resource,
				});
			case "/v1/cms/connection":
				return jsonResponse({ data: remoteConnection });
			default:
				throw new Error(`Unexpected request: ${url.toString()}`);
		}
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
};

describe.sequential("Lucid remote connection", () => {
	beforeEach(async () => {
		await database.client.deleteFrom("lucid_ai_generations").execute();
		await database.client.deleteFrom("lucid_remote_connections").execute();
		await database.client.deleteFrom("lucid_options").execute();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	afterAll(async () => {
		await database.destroy();
	});

	test("uses one shared connection row", async () => {
		const context = makeContext();
		const writable = await resolveWritableConnection(context);
		expect(writable.error).toBeUndefined();
		expect(writable.data).toBeDefined();
		expect((await resolveEffectiveConnection(context)).data?.id).toBe(
			writable.data?.id,
		);
		expect((await resolveWritableConnection(context)).data?.id).toBe(
			writable.data?.id,
		);
	});

	test("connects with PKCE and consumes the callback once", async () => {
		installOAuthFetch();
		const context = makeContext();
		const started = await connect(context, { browserBinding });
		expect(started.error).toBeUndefined();
		if (started.error) return;

		const authorizationUrl = new URL(started.data.authorizationUrl);
		expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe(
			"S256",
		);
		const state = authorizationUrl.searchParams.get("state");
		expect(state).toBeTruthy();

		const storedBeforeCallback = await resolveEffectiveConnection(context);
		expect(storedBeforeCallback.data?.registration_encrypted).not.toContain(
			registration.clientSecret,
		);
		expect(storedBeforeCallback.data?.pending_state_hash).not.toBe(state);

		const completed = await callback(context, {
			state: state ?? "",
			issuer,
			code: "authorization-code",
			browserBinding,
			parametersValid: true,
		});
		expect(completed.error).toBeUndefined();
		expect(
			new URL(
				completed.error ? callbackUrl : completed.data.location,
			).searchParams.get("result"),
		).toBe("connected");

		const stored = await resolveEffectiveConnection(context);
		expect(stored.data?.status).toBe("connected");
		if (!stored.data) return;
		expect(getConnectionGrant(context, stored.data)?.accessToken).toBe(
			"exchanged-access-token",
		);

		const replay = await callback(context, {
			state: state ?? "",
			issuer,
			code: "authorization-code",
			browserBinding,
			parametersValid: true,
		});
		expect(replay.error).toBeUndefined();
		expect(
			new URL(
				replay.error ? callbackUrl : replay.data.location,
			).searchParams.get("error"),
		).toBe("callback_state_invalid");
	});

	test("returns the connection identity with cached and refreshed access tokens", async () => {
		const context = makeContext();
		const row = await resolveWritableConnection(context);
		expect(row.data).toBeDefined();
		if (!row.data) return;

		await replaceConnectionRegistration(context, row.data.id, registration);
		await persistConnectionGrantState(context, row.data.id, grant(), {
			status: "connected",
		});

		expect(await getAccessToken(context, {})).toEqual({
			error: undefined,
			data: {
				accessToken: "access-token",
				lucidRemoteConnectionId: row.data.id,
			},
		});

		await persistConnectionGrantState(
			context,
			row.data.id,
			grant({ accessTokenExpiresAt: now() }),
		);
		vi.stubGlobal(
			"fetch",
			vi.fn<typeof fetch>(async () =>
				jsonResponse({
					access_token: "refreshed-access-token",
					token_type: "Bearer",
					expires_in: 900,
					scope: "cms:ai",
					resource,
				}),
			),
		);

		const refreshed = await getAccessToken(context, {});
		expect(refreshed.data).toEqual({
			accessToken: "refreshed-access-token",
			lucidRemoteConnectionId: row.data.id,
		});
		const stored = await resolveEffectiveConnection(context);
		expect(stored.data).toBeDefined();
		if (!stored.data) return;
		expect(getConnectionGrant(context, stored.data)?.refreshToken).toBe(
			"refresh-token",
		);
	});

	test("keeps AI usage when its remote connection is removed", async () => {
		const connection = await resolveWritableConnection(makeContext());
		expect(connection.data).toBeDefined();
		if (!connection.data) return;

		const created = await new AiGenerationsRepository(
			lucidDatabase,
		).createSingle({
			data: {
				request_id: "request-1",
				feature_key: "media.alt.generate",
				feature_version: "v1",
				lucid_remote_connection_id: connection.data.id,
				target_type: "media-alt",
				target: {},
				status: "success",
			},
		});
		expect(created.error).toBeUndefined();
		await database.client
			.deleteFrom("lucid_remote_connections")
			.where("id", "=", connection.data.id)
			.execute();

		const usage = await database.client
			.selectFrom("lucid_ai_generations")
			.select(["request_id", "lucid_remote_connection_id"])
			.executeTakeFirstOrThrow();
		expect(usage).toEqual({
			request_id: "request-1",
			lucid_remote_connection_id: null,
		});
	});

	test("disconnect clears the grant but keeps reusable registration", async () => {
		const context = makeContext();
		const row = await resolveWritableConnection(context);
		expect(row.data).toBeDefined();
		if (!row.data) return;

		await replaceConnectionRegistration(context, row.data.id, registration);
		await persistConnectionGrantState(context, row.data.id, grant(), {
			status: "connected",
		});
		vi.stubGlobal(
			"fetch",
			vi.fn<typeof fetch>(async () => new Response(null, { status: 200 })),
		);

		expect((await disconnect(context)).error).toBeUndefined();
		const disconnected = await resolveEffectiveConnection(context);
		expect(disconnected.data?.status).toBe("disconnected");
		if (!disconnected.data) return;
		expect(getConnectionGrant(context, disconnected.data)).toBeNull();
		expect(getConnectionRegistration(context, disconnected.data)).toEqual(
			registration,
		);
	});
});
