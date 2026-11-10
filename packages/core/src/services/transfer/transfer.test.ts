import type { TransferEntry } from "@lucidcms/types";
import { afterAll, assert, beforeAll, describe, expect, test } from "vitest";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import defineBrick from "../../libs/collection/define-brick.js";
import defineCollection from "../../libs/collection/define-collection.js";
import field from "../../libs/collection/definitions/fields/field.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import { copy, createTranslationStore } from "../../libs/i18n/index.js";
import { toWebReadable } from "../../libs/media-storage/normalize-body.js";
import type { ResolvedMediaStorageAdapter } from "../../libs/media-storage/types.js";
import createToolkit from "../../libs/toolkit/create-toolkit.js";
import type { TransferExportFile } from "../../libs/transfer/types.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import syncCollections from "../sync/sync-collections.js";
import syncLocales from "../sync/sync-locales.js";

const png = Uint8Array.from(
	atob(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	),
	(character) => character.charCodeAt(0),
);

/** Keeps uploaded files in memory, so each test site has its own storage. */
const createMemoryStorage = (): ResolvedMediaStorageAdapter => {
	const files = new Map<string, Uint8Array>();
	const missing = {
		error: { status: 404, message: copy.literal("Missing file") },
		data: undefined,
	};
	const unsupported = {
		error: { status: 500, message: copy.literal("Unsupported") },
		data: undefined,
	};
	return {
		type: "media-storage-adapter",
		key: "memory",
		createUploadSession: async () => unsupported,
		getDownloadUrl: async () => unsupported,
		getMeta: async (_, { key }) => {
			const file = files.get(key);
			if (!file) return missing;
			return {
				error: undefined,
				data: {
					size: file.byteLength,
					mimeType: null,
					etag: null,
					status: "ready",
				},
			};
		},
		stream: async (_, { key, range }) => {
			const file = files.get(key);
			if (!file) return missing;
			const body = range
				? file.slice(range.start, (range.end ?? file.byteLength - 1) + 1)
				: file;
			return {
				error: undefined,
				data: {
					contentLength: body.byteLength,
					contentType: undefined,
					body,
				},
			};
		},
		upload: async (_, { key, body }) => {
			const bytes = await new Response(toWebReadable(body)).arrayBuffer();
			files.set(key, new Uint8Array(bytes));
			return { error: undefined, data: {} };
		},
		delete: async (_, { key }) => {
			files.delete(key);
			return { error: undefined, data: undefined };
		},
		deleteMultiple: async (_, { keys }) => {
			for (const key of keys) files.delete(key);
			return { error: undefined, data: undefined };
		},
		rename: async (_, { from, to }) => {
			const file = files.get(from);
			if (!file) return missing;
			files.set(to, file);
			files.delete(from);
			return { error: undefined, data: undefined };
		},
	};
};

const banner = defineBrick({
	key: "banner",
	fields: [
		field.text("heading", {
			localized: true,
		}),
	],
});
/** The same pages collection on both sites, except the source still has a field the target removed. */
const pages = (withLegacy: boolean) => {
	const collection = defineCollection({
		key: "transfer_pages",
		mode: "multiple",
		localized: true,
		details: { labels: { singular: "Page", plural: "Pages" } },
		bricks: { builder: [banner] },
		fields: [
			field.text("title", { localized: true }),
			field.media("hero", { localized: false }),
			field.relation("related", {
				collection: "transfer_pages",
				multiple: true,
				localized: false,
			}),
			field.richText("body", {
				localized: false,
				editor: { media: true, links: { internal: true } },
			}),
			field.json("settings", { localized: false }),
			field.repeater("links", {
				fields: [field.text("label", { localized: false })],
			}),
		],
	});
	return withLegacy
		? collection.insertFields([field.text("legacy", { localized: false })])
		: collection;
};
/** Notes, which the target can require review for before new ones are created. */
const notes = (review: boolean) =>
	defineCollection({
		key: "transfer_notes",
		mode: "multiple",
		details: { labels: { singular: "Note", plural: "Notes" } },
		publishing: review ? { review: { publish: [], create: true } } : undefined,
		fields: [field.text("title")],
	});

const createSite = async (options: { legacy?: boolean; review?: boolean }) => {
	const fixture = getTestConfig();
	const config = await fixture.getConfig();
	const context = createServiceContext({
		config: {
			...config,
			collections: [
				pages(options.legacy ?? false),
				notes(options.review ?? false),
			],
			localization: {
				defaultLocale: "en",
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "French" },
				],
			},
		},
		database: await fixture.getDatabase(),
		mediaStorage: createMemoryStorage(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();
	expect((await syncCollections(context)).error).toBeUndefined();
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		(await applyCollectionMigrations(context, plan.data)).error,
	).toBeUndefined();

	return { fixture, context, toolkit: createToolkit(context) };
};

/** Bundles every media file in the export, as the admin's zip does. */
const bundleFiles = (file: TransferExportFile): TransferExportFile => ({
	...file,
	resources: {
		...file.resources,
		media: (file.resources.media ?? []).map((entry): TransferEntry => ({
			...entry,
			file: `files/${entry.uid}.png`,
		})),
	},
});
const files = async (path: string) => ({
	fileName: path.split("/").at(-1) ?? "file.png",
	mimeType: "image/png",
	body: png,
});

describe("transfer", () => {
	const actor = { type: "system" } as const;
	let source: Awaited<ReturnType<typeof createSite>>;
	let target: Awaited<ReturnType<typeof createSite>>;
	let exported: TransferExportFile;
	let mediaId: number;
	let aboutId: number;
	let teamId: number;

	beforeAll(async () => {
		source = await createSite({ legacy: true });
		target = await createSite({});

		const media = await source.toolkit.media.uploadFile({
			actor,
			public: true,
			file: { fileName: "team.png", mimeType: "image/png", body: png },
			title: [{ localeCode: "en", value: "Our team" }],
			alt: [{ localeCode: "en", value: "Five people at a desk" }],
			width: 1,
			height: 1,
		});
		assert(media.data, JSON.stringify(media.error));
		mediaId = media.data.id;

		const team = await source.toolkit.documents.createSingle({
			collectionKey: "transfer_pages",
			actor,
			data: { fields: { title: { en: "Team", fr: "Équipe" } } },
		});
		assert(team.data, JSON.stringify(team.error));
		teamId = team.data.id;

		const about = await source.toolkit.documents.createSingle({
			collectionKey: "transfer_pages",
			actor,
			data: {
				fields: {
					title: { en: "About", fr: "À propos" },
					hero: [mediaId],
					related: [{ id: teamId, collectionKey: "transfer_pages" }],
					legacy: "Old",
					//* keys that look like locales stay as they are, as the field isn't localized
					settings: { en: { key: "one" }, fr: { key: "two" } },
					body: {
						type: "doc",
						content: [
							{ type: "lucidMedia", attrs: { mediaId } },
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										text: "Meet the team",
										marks: [
											{
												type: "link",
												attrs: {
													kind: "document",
													collectionKey: "transfer_pages",
													documentId: teamId,
												},
											},
										],
									},
								],
							},
						],
					},
					links: [{ fields: { label: "Contact" } }],
				},
				bricks: {
					builder: [
						{
							key: "banner",
							fields: { heading: { en: "Hello", fr: "Bonjour" } },
						},
					],
				},
			},
		});
		assert(about.data, JSON.stringify(about.error));
		aboutId = about.data.id;

		//* the team page links back and to itself, so the import has to hold links back
		const linked = await source.toolkit.documents.updateSingle({
			collectionKey: "transfer_pages",
			id: teamId,
			actor,
			data: {
				fields: {
					related: [
						{ id: aboutId, collectionKey: "transfer_pages" },
						{ id: teamId, collectionKey: "transfer_pages" },
					],
				},
			},
		});
		assert(linked.data, JSON.stringify(linked.error));

		const file = await source.toolkit.transfer.export({
			actor,
			select: {
				documents: [{ collectionKey: "transfer_pages", ids: [aboutId] }],
			},
			linked: true,
		});
		assert(file.data, JSON.stringify(file.error));
		exported = bundleFiles(file.data);
	});
	afterAll(async () => {
		await source.fixture.destroy();
		await target.fixture.destroy();
	});

	test("exports the selection with its linked documents and media", () => {
		const documents = exported.resources.documents ?? [];
		expect(documents.map((entry) => entry.uid)).toHaveLength(2);
		expect(exported.resources.media).toHaveLength(1);

		const about = documents.find(
			(entry) =>
				"label" in entry &&
				entry.label === "About" &&
				entry.refs?.media?.[String(mediaId)],
		);
		assert(about);
		expect(about.refs?.documents?.[`transfer_pages:${teamId}`]).toBe(
			documents.find((entry) => entry !== about)?.uid,
		);
	});

	test("checks without saving, then imports and rewrites links to this site's records", async () => {
		const checked = await target.toolkit.transfer.import({
			actor,
			file: exported,
			dryRun: true,
		});
		assert(checked.data, JSON.stringify(checked.error));
		expect(
			checked.data.items.map((item) => [item.resource, item.status]),
		).toEqual([
			["media", "created"],
			["documents", "created"],
			["documents", "created"],
		]);
		const empty = await target.toolkit.documents.getMultiple({
			collectionKey: "transfer_pages",
			version: "latest",
		});
		expect(empty.data?.items).toHaveLength(0);

		const imported = await target.toolkit.transfer.import({
			actor,
			file: exported,
			files,
		});
		assert(imported.data, JSON.stringify(imported.error));
		expect(imported.data.items.map((item) => item.status)).toEqual([
			"created",
			"created",
			"created",
		]);

		const ids = Object.fromEntries(
			imported.data.items.map((item) => [item.label, item.id]),
		);
		const newMediaId = Number(ids["team.png"]);
		const [aboutKey, newAboutId] = String(ids.About).split(":");
		const newTeamId = Number(String(ids.Team).split(":")[1]);
		expect(aboutKey).toBe("transfer_pages");
		expect(
			imported.data.items.find((item) => item.label === "About")?.warnings,
		).toEqual(["Left out what this site's collection doesn't have: legacy."]);

		const about = await target.toolkit.documents.getEditable({
			collectionKey: "transfer_pages",
			id: Number(newAboutId),
		});
		assert(about.data, JSON.stringify(about.error));
		expect(about.data.data.fields).toMatchObject({
			title: { en: "About", fr: "À propos" },
			hero: [newMediaId],
			related: [{ id: newTeamId, collectionKey: "transfer_pages" }],
			settings: { en: { key: "one" }, fr: { key: "two" } },
			links: [{ fields: { label: "Contact" } }],
		});
		expect(about.data.data.fields.body).toMatchObject({
			content: [
				{ type: "lucidMedia", attrs: { mediaId: newMediaId } },
				{
					content: [{ marks: [{ attrs: { documentId: newTeamId } }] }],
				},
			],
		});
		expect(about.data.data.bricks.builder).toMatchObject([
			{ key: "banner", fields: { heading: { en: "Hello", fr: "Bonjour" } } },
		]);

		const team = await target.toolkit.documents.getEditable({
			collectionKey: "transfer_pages",
			id: newTeamId,
		});
		expect(team.data?.data.fields.related).toEqual([
			{ id: Number(newAboutId), collectionKey: "transfer_pages" },
			{ id: newTeamId, collectionKey: "transfer_pages" },
		]);

		const media = await target.toolkit.media.getSingle({
			actor,
			id: newMediaId,
		});
		expect(media.data).toMatchObject({
			title: { en: "Our team" },
			public: true,
		});
	});

	test("re-imports without changes and imports copies as new documents", async () => {
		const again = await target.toolkit.transfer.import({
			actor,
			file: exported,
			files,
		});
		assert(again.data, JSON.stringify(again.error));
		expect(again.data.items.map((item) => item.status)).toEqual([
			"unchanged",
			"unchanged",
			"unchanged",
		]);

		const copies = await target.toolkit.transfer.import({
			actor,
			file: exported,
			mode: "copy",
			files,
		});
		assert(copies.data, JSON.stringify(copies.error));
		expect(copies.data.items.map((item) => item.status)).toEqual([
			"unchanged",
			"created",
			"created",
		]);

		const documents = await target.toolkit.documents.getMultiple({
			collectionKey: "transfer_pages",
			version: "latest",
		});
		expect(documents.data?.items).toHaveLength(4);
	});

	test("links documents created in the same import when skipping what's already there", async () => {
		const fresh = await createSite({});
		try {
			const imported = await fresh.toolkit.transfer.import({
				actor,
				file: exported,
				mode: "skip",
				files,
			});
			assert(imported.data, JSON.stringify(imported.error));
			expect(imported.data.items.map((item) => item.status)).toEqual([
				"created",
				"created",
				"created",
			]);

			const ids = Object.fromEntries(
				imported.data.items.map((item) => [
					item.label,
					Number(item.id?.split(":")[1]),
				]),
			);
			const team = await fresh.toolkit.documents.getEditable({
				collectionKey: "transfer_pages",
				id: ids.Team ?? 0,
			});
			expect(team.data?.data.fields.related).toEqual([
				{ id: ids.About, collectionKey: "transfer_pages" },
				{ id: ids.Team, collectionKey: "transfer_pages" },
			]);
		} finally {
			await fresh.fixture.destroy();
		}
	});

	test("opens create requests where new documents are reviewed and reports links it can't make", async () => {
		const note = await source.toolkit.documents.createSingle({
			collectionKey: "transfer_notes",
			actor,
			data: { fields: { title: "Draft note" } },
		});
		assert(note.data, JSON.stringify(note.error));

		const file = await source.toolkit.transfer.export({
			actor,
			select: {
				documents: [
					{ collectionKey: "transfer_notes", ids: [note.data.id] },
					{ collectionKey: "transfer_pages", ids: [teamId] },
				],
			},
		});
		assert(file.data, JSON.stringify(file.error));

		const fresh = await createSite({ review: true });
		try {
			const imported = await fresh.toolkit.transfer.import({
				actor,
				file: file.data,
			});
			assert(imported.data, JSON.stringify(imported.error));

			const noteResult = imported.data.items.find(
				(item) => item.label === "Draft note",
			);
			expect(noteResult?.status).toBe("requested");
			const teamResult = imported.data.items.find(
				(item) => item.label === "Team",
			);
			expect(teamResult).toMatchObject({
				status: "created",
				warnings: ["Left out links this site can't make: Document (1)."],
			});

			const requested = await fresh.toolkit.transfer.import({
				actor,
				file: file.data,
			});
			expect(
				requested.data?.items.find((item) => item.label === "Draft note")
					?.status,
			).toBe("requested");
		} finally {
			await fresh.fixture.destroy();
		}
	});
});
