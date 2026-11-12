import createAgent from "./agent.ts";
import createGenerate from "./generate.ts";
import { AGENT_CATALOGUE, MEDIA_CATALOGUES } from "./models.ts";
import createOAuth from "./oauth.ts";
import createState, { type FakeConnection } from "./state.ts";
import type { FakeConnectionChange } from "./types.ts";
import { remoteError } from "./usage.ts";

/**
 * Fakes connection, models, AI features, files, catalogues and credits via
 * `LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE`. Models use request scripts; `/harness` routes
 * inspect and configure connections.
 */
const createLucidApi = (issuer: string) => {
	const state = createState();
	const oauth = createOAuth(state, issuer);
	const agent = createAgent(state);
	const generate = createGenerate(state);

	/** Routes that need a connection's access token. */
	const api = async (
		request: Request,
		connection: FakeConnection,
		parts: string[],
	): Promise<Response> => {
		const url = new URL(request.url);
		//* `/v1/cms/ai/<area>/<id>`, where a file's storage key may hold encoded slashes
		const [, , , area, ...ids] = parts;
		const id = ids.length ? decodeURIComponent(ids.join("/")) : undefined;

		if (request.method === "POST" && url.pathname === "/v1/cms/ai/agent") {
			return agent.answer(request, connection);
		}
		if (request.method === "GET" && area === "agent" && id) {
			return agent.status(connection, id);
		}
		if (request.method === "POST" && url.pathname === "/v1/cms/ai/generate") {
			return generate.generate(request, connection);
		}
		if (request.method === "GET" && area === "requests" && id) {
			return generate.poll(connection, id);
		}
		if (request.method === "GET" && area === "media" && id) {
			return generate.media(id);
		}
		if (request.method === "GET" && url.pathname === "/v1/cms/ai/models") {
			const feature = url.searchParams.get("feature");
			const catalogue =
				feature === "agent"
					? AGENT_CATALOGUE
					: feature === "image" || feature === "audio"
						? MEDIA_CATALOGUES[feature]
						: undefined;
			return catalogue
				? Response.json({ data: catalogue })
				: remoteError(400, "cms_ai_feature_not_supported");
		}
		if (request.method === "GET" && url.pathname === "/v1/cms/credits") {
			return generate.credits(connection);
		}
		if (request.method === "POST" && url.pathname === "/v1/cms/bug-reports") {
			return Response.json(
				{ data: { id: crypto.randomUUID() } },
				{ status: 201 },
			);
		}
		return remoteError(404, "not_found");
	};

	/** Routes only the harness calls, to see and change what the fake does for a connection. */
	const control = async (
		request: Request,
		parts: string[],
	): Promise<Response> => {
		const [area, name = "", detail] = parts.map(decodeURIComponent);

		if (area === "gates") {
			if (request.method === "POST") {
				state.openGate(name);
			}
			if (new URL(request.url).searchParams.get("wait")) {
				await state.waitForGate(name, request.signal);
			}
			return Response.json(state.gateStatus(name));
		}
		if (area === "effects") {
			if (request.method === "POST") {
				state.recordEffect(name, await request.json());
			}
			return Response.json(state.effects(name));
		}

		const connection = state.connections.get(name);
		if (area !== "connections" || !connection) {
			return new Response("Unknown connection.", { status: 404 });
		}
		if (detail === "ledger") {
			return Response.json(connection.ledger);
		}
		if (request.method === "PATCH") {
			const change = (await request.json()) as FakeConnectionChange;
			if (change.features) {
				connection.features = change.features;
			}
			if (change.credits !== undefined) {
				connection.credits = Math.max(0, change.credits);
			}
			if (change.revoked !== undefined) {
				connection.revoked = change.revoked;
			}
			if (change.tokenLifetimeSeconds !== undefined) {
				connection.tokenLifetimeSeconds = change.tokenLifetimeSeconds;
			}
		}
		return Response.json(state.view(connection));
	};

	/** Answers a request whose path is from the API's root, such as `/v1/oauth/register`. */
	return async (request: Request, path: string): Promise<Response> => {
		const parts = path.split("/").filter(Boolean);
		if (parts[0] === "harness") {
			return control(request, parts.slice(1));
		}

		const answered = await oauth(request, path);
		if (answered) {
			return answered;
		}

		if (parts[0] !== "v1" || parts[1] !== "cms") {
			return remoteError(404, "not_found");
		}
		const connection = state.authenticate(request);
		if (!connection) {
			return remoteError(401, "unauthorised");
		}
		const response = await api(request, connection, parts);
		if (
			!path.startsWith("/v1/cms/ai/agent") &&
			path !== "/v1/cms/ai/generate"
		) {
			state.record(connection, {
				kind: "call",
				at: new Date().toISOString(),
				method: request.method,
				path,
				status: response.status,
			});
		}
		return response;
	};
};

export default createLucidApi;
