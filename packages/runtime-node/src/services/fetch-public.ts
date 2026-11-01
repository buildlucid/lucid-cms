import { lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { isPublicAddress } from "@lucidcms/core/runtime";
import type { PublicFetch } from "@lucidcms/core/types";

const nullBodyStatuses = new Set([204, 205, 304]);

/**
 * Rejects non-public DNS results and connects using the checked addresses to prevent DNS
 * rebinding.
 */
const publicLookup: LookupFunction = (hostname, options, callback) => {
	lookup(hostname, { ...options, all: true }, (error, addresses) => {
		if (error) {
			callback(error, []);
			return;
		}

		const [first] = addresses;
		if (!first || addresses.some(({ address }) => !isPublicAddress(address))) {
			callback(new Error(`${hostname} resolves to a private address.`), []);
			return;
		}

		if (options.all) {
			callback(null, addresses);
			return;
		}
		callback(null, first.address, first.family);
	});
};

/** Sends GET requests through Node's HTTP modules, refusing private addresses. */
const fetchPublic: PublicFetch = async (url, init = {}) => {
	//* IP literals bypass DNS lookup and need a separate check.
	const hostname = url.hostname.replace(/^\[|\]$/g, "");
	if (isIP(hostname) !== 0 && !isPublicAddress(hostname)) {
		throw new TypeError(`${hostname} isn't a public address.`);
	}

	const client = url.protocol === "https:" ? https : http;
	return new Promise((resolve, reject) => {
		const request = client.get(
			url,
			{
				headers: Object.fromEntries(new Headers(init.headers)),
				lookup: publicLookup,
				signal: init.signal ?? undefined,
			},
			(response) => {
				const headers = new Headers();
				for (const [name, value] of Object.entries(response.headers)) {
					if (value === undefined) continue;
					for (const item of Array.isArray(value) ? value : [value]) {
						headers.append(name, item);
					}
				}

				const status = response.statusCode ?? 0;
				const hasBody = !nullBodyStatuses.has(status);
				if (!hasBody) response.resume();

				//* Preserve backpressure while adapting the Node response.
				const chunks = response[Symbol.asyncIterator]();
				const body = new ReadableStream<Uint8Array>({
					pull: async (controller) => {
						const chunk = await chunks.next();
						if (chunk.done) {
							controller.close();
							return;
						}
						controller.enqueue(chunk.value);
					},
					cancel: () => {
						response.destroy();
					},
				});

				//* Destroy the response if its status is invalid for the Fetch API.
				try {
					resolve(
						new Response(hasBody ? body : null, {
							status,
							statusText: response.statusMessage,
							headers,
						}),
					);
				} catch (error) {
					response.destroy();
					reject(error);
				}
			},
		);
		request.on("error", reject);
	});
};

export default fetchPublic;
