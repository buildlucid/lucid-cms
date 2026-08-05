import { Buffer } from "node:buffer";
import { Miniflare } from "miniflare";
import { afterEach, describe, expect, it } from "vitest";

const instances: Miniflare[] = [];

afterEach(async () => {
	await Promise.all(instances.splice(0).map((instance) => instance.dispose()));
});

describe("Cloudflare Images local binding", () => {
	it("resizes, rotates, and converts through Miniflare", async () => {
		const miniflare = new Miniflare({
			compatibilityDate: "2026-06-30",
			modules: true,
			images: { binding: "LUCID_IMAGES" },
			script: `
				export default {
					async fetch(request, env) {
						const output = await env.LUCID_IMAGES
							.input(request.body)
							.transform({ rotate: 90 })
							.transform({ width: 1 })
							.output({ format: "image/webp" });
						const info = await env.LUCID_IMAGES.info(output.image());
						return Response.json({
							contentType: output.contentType(),
							width: info.width,
							height: info.height,
						});
					},
				};
			`,
		});
		instances.push(miniflare);

		const png = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAD0lEQVQImWP4z8Dwn4EBAAj+Af/KOtJRAAAAAElFTkSuQmCC",
			"base64",
		);
		const response = await miniflare.dispatchFetch("http://localhost", {
			method: "POST",
			body: png,
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			contentType: "image/webp",
			width: 1,
			height: 2,
		});
	});
});
