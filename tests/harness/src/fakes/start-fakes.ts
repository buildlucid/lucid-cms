import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import serveFetch from "../utils/serve-fetch.ts";
import createIdentityProvider from "./create-identity-provider.ts";
import createLucidApi from "./create-lucid-api.ts";

/** An outbox instance's name, which becomes a folder. */
const INSTANCE = /^[a-z0-9-]{1,64}$/;

/**
 * The run's stand-ins for services a CMS talks to over HTTP, which work from every runtime: an
 * outbox, an identity provider and Lucid's own API.
 */
export type Fakes = {
	url: string;
	/**
	 * Keeps the emails a setup's CMSs post to `<url>/<instance>` in `<directory>/<instance>`, and
	 * returns `url`. Each CMS posts to its own instance, so tests only see their own emails.
	 */
	outbox(setup: string, directory: string): string;
	/** The identity provider's issuer, which the `authentication` fragment's providers use. */
	identityProvider: string;
	/** Lucid's own API, which a CMS connects to instead of Lucid's servers. It answers at the root. */
	lucidApi: string;
	stop(): Promise<void>;
};

/** Starts the run's fakes on a free local port. The runner starts them once and stops them at the end. */
const startFakes = async (): Promise<Fakes> => {
	const outboxes = new Map<string, string>();
	let identityProvider: ReturnType<typeof createIdentityProvider> | undefined;
	let lucidApi: ReturnType<typeof createLucidApi> | undefined;

	const receiveEmail = async (
		request: Request,
		[setup = "", instance = ""]: string[],
	): Promise<Response> => {
		const directory = outboxes.get(setup);
		if (request.method !== "POST" || !directory || !INSTANCE.test(instance)) {
			return new Response("Unknown outbox.", { status: 404 });
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

	const server = await serveFetch(async (request) => {
		const { pathname } = new URL(request.url);
		const [area, ...rest] = pathname.split("/").filter(Boolean);
		switch (area) {
			case "outbox":
				return receiveEmail(request, rest.map(decodeURIComponent));
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
			outboxes.set(setup, directory);
			return `${server.url}/outbox/${encodeURIComponent(setup)}`;
		},
		identityProvider: issuer,
		lucidApi: server.url,
		stop: server.close,
	};
};

export default startFakes;
