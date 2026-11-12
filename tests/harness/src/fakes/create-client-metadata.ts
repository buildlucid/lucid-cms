/** Where every metadata document's client is sent back to. Nothing answers it. */
export const CLIENT_METADATA_REDIRECT = "http://127.0.0.1/harness/callback";

/** How a document is served, named in its URL: `/clients/<scenario>/<any name>`. */
export const CLIENT_METADATA_SCENARIOS = [
	"valid",
	"wrong-type",
	"oversized",
	"slow",
	"other-id",
	"confidential",
	"unsafe-redirect",
	"moved",
	"missing",
] as const;

export type ClientMetadataScenario = (typeof CLIENT_METADATA_SCENARIOS)[number];

/** Longer than the CMS waits for a document. */
const SLOW_MS = 6_000;

const sleep = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});

/**
 * Serves OAuth client metadata documents, which name a client by the URL they are fetched from.
 * Each scenario breaks one rule the CMS checks a document against, except `valid`.
 */
const createClientMetadata =
	() =>
	async (request: Request, [scenario = ""]: string[]): Promise<Response> => {
		//* the client ID is the document's own address, as the CMS asked for it
		const url = request.url;
		const document = {
			client_id: url,
			client_name: "Harness Metadata App",
			redirect_uris: [CLIENT_METADATA_REDIRECT],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
		};

		switch (scenario as ClientMetadataScenario) {
			case "valid":
				return Response.json(document);
			case "wrong-type":
				return new Response(JSON.stringify(document), {
					headers: { "content-type": "text/plain" },
				});
			case "oversized":
				return Response.json({ ...document, padding: "x".repeat(6_000) });
			case "slow":
				await sleep(SLOW_MS, request.signal);
				return Response.json(document);
			case "other-id":
				return Response.json({ ...document, client_id: `${url}-other` });
			case "confidential":
				return Response.json({
					...document,
					token_endpoint_auth_method: "client_secret_basic",
				});
			case "unsafe-redirect":
				return Response.json({
					...document,
					redirect_uris: ["http://elsewhere.example/callback"],
				});
			case "moved":
				return new Response(null, {
					status: 302,
					headers: { location: url.replace("/moved/", "/valid/") },
				});
			default:
				return new Response("No such client.", { status: 404 });
		}
	};

export default createClientMetadata;
