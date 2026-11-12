import crypto from "node:crypto";
import {
	findGenerateFailure,
	findGenerateGate,
	unescapeMarkdown,
} from "../../../../shared/agent-script.ts";
import { files } from "../../../../shared/media.ts";
import type { FakeConnection, FakeState, GenerateRequest } from "./state.ts";
import type { AiFeature, GenerateEntry } from "./types.ts";
import { modelUsage, remoteError, webUsage } from "./usage.ts";

type GenerateBody = {
	feature: { key: string; version: string };
	sessionId?: string;
	input?: Array<{ type: string; role: string; value?: string }>;
	context?: Record<string, unknown>;
	generation?: Record<string, unknown>;
	actor: GenerateEntry["actor"];
};

/** The organisation feature each generate feature needs, as Lucid's API checks it. */
const ACCESS: Record<string, AiFeature> = {
	"agent.title.generate": "chat_titles",
	"media.alt.generate": "alt_text",
	"media.analyze": "media_analysis",
	"media.image.generate": "image_generation",
	"media.audio.generate": "audio_generation",
	"content.translate": "translation",
	"web.search": "web_research",
	"web.fetch": "web_research",
};

/** Features Lucid answers later, which the CMS polls for. */
const ASYNC_FEATURES = new Set([
	"media.image.generate",
	"media.audio.generate",
]);

/** Drops the harness's own markers from text a fake output repeats. */
export const plain = (text: string) =>
	unescapeMarkdown(text)
		.replaceAll(/\[harness-[a-z]+:[^\]]*\]/g, "")
		.replaceAll(/<message_context[^>]*\/>/g, "")
		.trim();

const words = (text: string, count: number) =>
	plain(text).split(/\s+/).filter(Boolean).slice(0, count).join(" ");

/** Marks a translation with its locale, leaving rich text's tags as they were. */
export const translateText = (
	text: string,
	format: string,
	locale: string,
): string =>
	format === "html"
		? text.replace(/>([^<]+)</, (_, inner: string) => `>[${locale}] ${inner}<`)
		: `[${locale}] ${text}`;

/** What the fake's alt text says for a media item. */
export const altText = (name: string, locale?: string) =>
	`${locale ? `[${locale}] ` : ""}Alt text for ${name}`;

const pick = (value: unknown): string => {
	if (typeof value === "string") {
		return value;
	}
	if (value && typeof value === "object") {
		const first = Object.values(value).find(
			(item): item is string => typeof item === "string",
		);
		return first ?? "";
	}
	return "";
};

/** Lucid's generate endpoint and what it hands back later: polls, files, catalogues and credits. */
const createGenerate = (state: FakeState) => {
	/** The output a feature answers with. Each is plain and predictable, so tests can assert on it. */
	const output = (
		body: GenerateBody,
		requestId: string,
	): Record<string, unknown> => {
		const context = body.context ?? {};
		const instruction =
			body.input?.find((item) => item.type === "text")?.value ?? "";

		switch (body.feature.key) {
			case "agent.title.generate": {
				//* the conversation comes as `role: text` lines, the first message first
				const first = (instruction.split("\n").find(Boolean) ?? "").replace(
					/^\w+:\s*/,
					"",
				);
				return { title: `Harness chat: ${words(first, 5) || "untitled"}` };
			}
			case "media.alt.generate": {
				const locale = context.locale as { target: string | string[] | null };
				const media = (context.media ?? {}) as { name?: unknown };
				const name = pick(media.name) || "the image";
				const targets = locale.target === null ? null : [locale.target].flat();
				return targets === null
					? { kind: "value", value: altText(name) }
					: {
							kind: "translations",
							translations: Object.fromEntries(
								targets.map((target) => [target, altText(name, target)]),
							),
						};
			}
			case "content.translate": {
				const locale = context.locale as { target: { code: string } };
				const segments = (context.segments ?? []) as Array<{
					id: string;
					format: string;
					text: string;
				}>;
				return {
					segments: Object.fromEntries(
						segments.map((segment) => [
							segment.id,
							translateText(segment.text, segment.format, locale.target.code),
						]),
					),
				};
			}
			case "media.analyze":
				return {
					analysis: `Harness analysis: ${plain(String(context.question ?? ""))}`,
				};
			case "web.search": {
				const domain =
					(context.allowedDomains as string[] | undefined)?.[0] ??
					"example.com";
				const query = plain(String(context.query ?? ""));
				const slug = query.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
				return {
					results: [1, 2].map((rank) => ({
						url: `https://${domain}/harness/${slug}-${rank}`,
						title: `Result ${rank} for ${query}`,
						publishedAt: null,
						excerpts: [`Excerpt ${rank} about ${query}`],
					})),
				};
			}
			case "web.fetch": {
				const url = String(context.url ?? "");
				return {
					url,
					title: `Harness page ${new URL(url).pathname}`,
					publishedAt: null,
					content: `Harness content of ${url}`,
					contentType: "page",
					truncated: false,
				};
			}
			case "media.image.generate": {
				const file = files.png({ shade: crypto.randomInt(256) });
				//* the CMS only proxies keys shaped like Lucid's own
				const storageKey = `generated-media/${crypto.randomUUID()}.png`;
				state.media.set(storageKey, file);
				return {
					id: requestId,
					url: `https://lucid.invalid/media/${storageKey}`,
					storageKey,
					byteSize: file.bytes.byteLength,
					mimeType: file.mimeType,
					extension: "png",
					aspectRatio: String(body.generation?.aspectRatio ?? "1:1"),
					resolution: null,
					quality: null,
				};
			}
			case "media.audio.generate": {
				const file = files.mp3();
				const storageKey = `generated-media/${crypto.randomUUID()}.mp3`;
				state.media.set(storageKey, file);
				return {
					id: requestId,
					url: `https://lucid.invalid/media/${storageKey}`,
					storageKey,
					byteSize: file.bytes.byteLength,
					mimeType: file.mimeType,
					extension: "mp3",
					voice: String(body.generation?.voice ?? "harness-voice"),
					characters: instruction.length,
				};
			}
			default:
				return {};
		}
	};

	const usage = (body: GenerateBody, requestId: string, credits: number) =>
		body.feature.key.startsWith("web.")
			? webUsage({
					operation: body.feature.key === "web.search" ? "search" : "fetch",
					requestId,
					credits,
				})
			: modelUsage({
					model: `harness/${body.feature.key}`,
					inputChars: JSON.stringify(body.input ?? []).length,
					outputChars: 100,
					credits,
				});

	const generate = async (
		request: Request,
		connection: FakeConnection,
	): Promise<Response> => {
		const raw = await request.text();
		const body = JSON.parse(raw) as GenerateBody;
		const requestId =
			request.headers.get("idempotency-key") || crypto.randomUUID();
		const { actor, ...rest } = body;
		const record = (outcome: GenerateEntry["outcome"], creditsCharged = 0) =>
			state.record(connection, {
				kind: "generate",
				at: new Date().toISOString(),
				requestId,
				feature: body.feature.key,
				sessionId: body.sessionId ?? null,
				outcome,
				creditsCharged,
				actor,
				request: rest,
			});

		const existing = state.generateRequests.get(requestId);
		if (existing?.connectionId === connection.id) {
			record("replayed");
			return respond(requestId, existing);
		}

		const access = ACCESS[body.feature.key];
		if (access && !connection.features.includes(access)) {
			record("failed");
			return remoteError(403, "ai_feature_disabled");
		}

		const failure = findGenerateFailure(raw);
		const credits = 1;
		if (!failure && !state.charge(connection, credits)) {
			record("failed");
			return remoteError(402, "organisation_ai_credit_exhausted");
		}

		const mode = ASYNC_FEATURES.has(body.feature.key) ? "async" : "sync";
		const generated: GenerateRequest = {
			connectionId: connection.id,
			feature: body.feature,
			result: failure
				? { type: "error", ...failure }
				: {
						type: "complete",
						data: {
							mode,
							status: "complete",
							requestId,
							feature: body.feature,
							output: output(body, requestId),
							usage: usage(body, requestId, credits),
						},
					},
			gate: findGenerateGate(raw),
		};
		state.generateRequests.set(requestId, generated);

		if (mode === "async") {
			record(failure ? "failed" : "accepted", failure ? 0 : credits);
			return Response.json({
				data: { mode, requestId, feature: body.feature, status: "queued" },
			});
		}

		//* a sync request holds its answer until the gate opens, as a slow model would
		if (
			generated.gate &&
			!(await state.waitForGate(generated.gate, request.signal))
		) {
			if (!failure) {
				state.refund(connection, credits);
			}
			record("failed");
			return remoteError(499, "cms_ai_request_cancelled");
		}
		record(failure ? "failed" : "answered", failure ? 0 : credits);
		return respond(requestId, generated);
	};

	/** Answers with a request's result, or that it is still processing while its gate is shut. */
	const respond = (requestId: string, generated: GenerateRequest): Response => {
		if (generated.gate && !state.gateOpen(generated.gate)) {
			return Response.json({
				data: {
					mode: "async",
					requestId,
					feature: generated.feature,
					status: "processing",
				},
			});
		}
		return generated.result.type === "error"
			? remoteError(generated.result.status, generated.result.key)
			: Response.json({ data: generated.result.data });
	};

	const poll = (connection: FakeConnection, requestId: string): Response => {
		const generated = state.generateRequests.get(requestId);
		if (!generated || generated.connectionId !== connection.id) {
			return remoteError(404, "cms_ai_generation_request_not_found");
		}
		return respond(requestId, generated);
	};

	const media = (storageKey: string): Response => {
		const file = state.media.get(storageKey);
		if (!file) {
			return remoteError(404, "cms_ai_generated_media_not_found");
		}
		return new Response(Buffer.from(file.bytes), {
			headers: {
				"content-type": file.mimeType,
				"content-length": String(file.bytes.byteLength),
			},
		});
	};

	const credits = (connection: FakeConnection): Response => {
		const total = connection.credits + connection.charged;
		return Response.json({
			data: {
				available: String(connection.credits),
				allowance: null,
				granted: {
					total: String(total),
					used: String(connection.charged),
					remaining: String(connection.credits),
				},
				purchased: { total: "0", used: "0", remaining: "0" },
				connectionCap: null,
				hasDebt: false,
			},
		});
	};

	return { generate, poll, media, credits };
};

export default createGenerate;
