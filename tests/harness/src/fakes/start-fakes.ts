import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import serveFetch from "../utils/serve-fetch.ts";
import createClientMetadata from "./create-client-metadata.ts";
import createIdentityProvider from "./create-identity-provider.ts";
import createLucidApi from "./lucid-api/create-lucid-api.ts";

/** An outbox or ledger instance's name, which becomes a folder. */
const INSTANCE = /^[a-z0-9-]{1,64}$/;

/** What the fakes collect from CMSs and keep as files: sent emails, and what probe jobs did. */
type Collection = "outbox" | "ledger";

/**
 * The run's stand-ins for services a CMS talks to over HTTP, which work from every runtime: an
 * outbox, a ledger of job executions, an identity provider, OAuth client metadata documents at
 * `/clients` and Lucid's own API.
 */
export type Fakes = {
	url: string;
	/**
	 * Keeps the emails a setup's CMSs post to `<url>/<instance>` in `<directory>/<instance>`, and
	 * returns `url`. Each CMS posts to its own instance, so tests only see their own emails.
	 */
	outbox(setup: string, directory: string): string;
	/**
	 * Keeps what a setup's probe jobs post to `<url>/<instance>` in `<directory>/<instance>`, and
	 * returns `url`. See `shared/config/fragments/jobs.ts`.
	 */
	ledger(setup: string, directory: string): string;
	/** The identity provider's issuer, which the `authentication` fragment's providers use. */
	identityProvider: string;
	/** Lucid's own API, which a CMS connects to instead of Lucid's servers. It answers at the root. */
	lucidApi: string;
	stop(): Promise<void>;
};

/** Starts the run's fakes on a free local port. The runner starts them once and stops them at the end. */
const startFakes = async (): Promise<Fakes> => {
	const folders: Record<Collection, Map<string, string>> = {
		outbox: new Map(),
		ledger: new Map(),
	};
	let identityProvider: ReturnType<typeof createIdentityProvider> | undefined;
	let lucidApi: ReturnType<typeof createLucidApi> | undefined;

	const receive = async (
		collection: Collection,
		request: Request,
		[setup = "", instance = ""]: string[],
	): Promise<Response> => {
		const directory = folders[collection].get(setup);
		if (request.method !== "POST" || !directory || !INSTANCE.test(instance)) {
			return new Response(`Unknown ${collection}.`, { status: 404 });
		}

		const folder = path.join(directory, instance);
		await mkdir(folder, { recursive: true });
		//* file names start with when they were written, so the newest sorts last
		await writeFile(
			path.join(folder, `${Date.now()}-${randomUUID()}.json`),
			await request.text(),
		);
		return new Response(null, { status: 204 });
	};

	const clientMetadata = createClientMetadata();

	const server = await serveFetch(async (request) => {
		const { pathname } = new URL(request.url);
		const [area, ...rest] = pathname.split("/").filter(Boolean);
		switch (area) {
			case "outbox":
			case "ledger":
				return receive(area, request, rest.map(decodeURIComponent));
			case "clients":
				return clientMetadata(request, rest.map(decodeURIComponent));
			case "idp":
				return identityProvider
					? identityProvider(request, `/${rest.join("/")}`)
					: new Response("Not ready.", { status: 503 });
			default:
				return lucidApi
					? lucidApi(request, pathname)
					: new Response("Not ready.", { status: 503 });
		}
	});
	const issuer = `${server.url}/idp`;
	identityProvider = createIdentityProvider(issuer);
	lucidApi = createLucidApi(server.url);

	return {
		url: server.url,
		outbox: (setup, directory) => {
			folders.outbox.set(setup, directory);
			return `${server.url}/outbox/${encodeURIComponent(setup)}`;
		},
		ledger: (setup, directory) => {
			folders.ledger.set(setup, directory);
			return `${server.url}/ledger/${encodeURIComponent(setup)}`;
		},
		identityProvider: issuer,
		lucidApi: server.url,
		stop: server.close,
	};
};

export default startFakes;
