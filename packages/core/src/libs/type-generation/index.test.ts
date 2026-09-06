import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import BrickBuilder from "../collection/builders/brick-builder/index.js";
import CollectionBuilder from "../collection/builders/collection-builder/index.js";
import resolveConfig from "../config/resolve-config.js";
import { copy } from "../i18n/index.js";
import generateTypes from "./index.js";

test("generates project and plugin access keys and removes stale declarations", async () => {
	const cwd = process.cwd();
	const projectRoot = await mkdtemp(path.join(tmpdir(), "lucid-access-types-"));
	const configPath = path.join(projectRoot, "lucid.config.ts");
	const base = await getTestConfig().getConfig();
	try {
		process.chdir(projectRoot);
		await writeFile(configPath, "export default {};\n");
		const config = await resolveConfig(
			{
				...base,
				access: [
					{
						key: "reports",
						name: "Reports",
						permissions: { "reports:read": { name: "Read reports" } },
					},
				],
				plugins: [
					{
						key: "exports",
						lucid: "*",
						configure(config) {
							config.access.push({
								key: "exports",
								name: "Exports",
								scopes: { "exports:read": { userPermission: "reports:read" } },
							});
						},
					},
				],
			},
			{ resolvedDb: base.db, mode: "build" },
		);
		await generateTypes({ ...config, projectRoot, configPath });
		const outputPath = path.join(projectRoot, ".lucid", "types.d.ts");
		const generated = await readFile(outputPath, "utf8");
		for (const module of ["@lucidcms/core/types", "@lucidcms/types"]) {
			expect(generated).toContain(`declare module '${module}'`);
		}
		expect(generated.match(/"reports:read": true;/g)).toHaveLength(2);
		expect(generated.match(/"exports:read": true;/g)).toHaveLength(2);
		await generateTypes({ ...config, access: [], projectRoot, configPath });
		const regenerated = await readFile(outputPath, "utf8");
		expect(regenerated).not.toContain("reports:read");
		expect(regenerated).not.toContain("exports:read");
	} finally {
		process.chdir(cwd);
		await rm(projectRoot, { recursive: true, force: true });
	}
});

test("generates collection-aware client document types that lean on the public Lucid contracts", async () => {
	const cwd = process.cwd();
	const tempDir = await mkdtemp(path.join(tmpdir(), "lucid-type-gen-"));
	const configPath = path.join(tempDir, "lucid.config.ts");
	const translationsDir = path.join(tempDir, "translations");

	await writeFile(configPath, "export default {};\n");
	await mkdir(translationsDir);
	await writeFile(
		path.join(translationsDir, "en.admin.json"),
		JSON.stringify({
			"custom.admin.title": "Custom admin title",
			"custom.shared.key": "Admin shared key",
		}),
	);
	await writeFile(
		path.join(translationsDir, "en.server.json"),
		JSON.stringify({
			"custom.server.error": "Custom server error",
		}),
	);
	await writeFile(
		path.join(translationsDir, "fr.admin.json"),
		JSON.stringify({
			"custom.admin.french": "Titre admin",
			"custom.shared.key": "Cle partagee",
		}),
	);

	const BannerBrick = new BrickBuilder("banner")
		.addTab("content_tab")
		.addText("title", {
			localized: true,
		})
		.addRepeater("call_to_actions")
		.addText("label", {
			localized: false,
		})
		.endRepeater();

	const PageCollection = new CollectionBuilder("page", {
		mode: "multiple",
		details: {
			labels: {
				singular: copy("admin:tests.collections.page.singularName", {
					defaultMessage: "Page",
				}),
				plural: copy("admin:tests.collections.page.name", {
					defaultMessage: "Pages",
				}),
			},
		},
		localized: { locales: ["en", "fr"] },
		bricks: {
			builder: [BannerBrick],
		},
		publishing: {
			targets: [
				{
					key: "published",
					label: copy("admin:tests.environments.published.name", {
						defaultMessage: "Published",
					}),
				},
			],
		},
	})
		.addText("_page_title", {
			localized: true,
		})
		.addRelation("_related_page", {
			collection: "page",
			localized: false,
		})
		.addRelation("_related_content", {
			collection: ["page", "blog"],
			localized: false,
			multiple: true,
		})
		.addRepeater("sections")
		.addText("_section_title", {
			localized: false,
		})
		.endRepeater();
	const ArticleCollection = new CollectionBuilder("article", {
		mode: "multiple",
		details: {
			labels: {
				singular: "Article",
				plural: "Articles",
			},
		},
		localized: { locales: ["de"], defaultLocale: "de" },
	}).addText("title", { localized: true });

	try {
		process.chdir(tempDir);

		await generateTypes({
			access: [],
			configPath,
			projectRoot: tempDir,
			collections: [PageCollection, ArticleCollection],
			localization: {
				locales: [
					{
						label: "English",
						code: "en",
					},
					{
						label: "French",
						code: "fr",
					},
					{
						label: "German",
						code: "de",
					},
				],
				defaultLocale: "en",
			},
		});

		const typesContent = await readFile(
			path.join(tempDir, ".lucid", "types.d.ts"),
			"utf8",
		);
		const clientContent = await readFile(
			path.join(tempDir, ".lucid", "client.d.ts"),
			"utf8",
		);

		expect(typesContent).toContain('/// <reference path="./client.d.ts" />');
		expect(typesContent).toContain(
			'import type translationSource0 from "../translations/en.admin.json";',
		);
		expect(typesContent).toContain(
			'import type translationSource1 from "../translations/en.server.json";',
		);
		expect(typesContent).toContain(
			'import type translationSource2 from "../translations/fr.admin.json";',
		);
		expect(typesContent).toMatch(
			/`admin:\$\{Extract<keyof typeof translationSource0, string>\}`/,
		);
		expect(typesContent).toMatch(
			/`admin:\$\{Extract<keyof typeof translationSource2, string>\}`/,
		);
		expect(typesContent).toMatch(
			/`server:\$\{Extract<keyof typeof translationSource1, string>\}`/,
		);
		expect(typesContent).toContain(
			"interface CopyTranslationKeys extends Record<GeneratedCopyTranslationKey, true> {}",
		);
		expect(typesContent).not.toContain('"admin:custom.admin.title": true;');
		expect(typesContent).not.toContain('"server:custom.server.error": true;');
		expect(clientContent).toContain(`from "@lucidcms/core/types";`);
		expect(
			clientContent,
		).toContain(`export interface GeneratedCollectionDocumentLocaleCodesByCollection {
	"page": "en" | "fr";
	"article": "de";
}`);
		expect(clientContent).toContain(
			`export type CollectionDocumentLocaleCode<TCollectionKey extends string = string> = TCollectionKey extends keyof GeneratedCollectionDocumentLocaleCodesByCollection ? Extract<GeneratedCollectionDocumentLocaleCodesByCollection[TCollectionKey], string> : string;`,
		);
		expect(
			clientContent,
		).toContain(`export type PageCollectionDocumentFields = {
	"_page_title": CollectionDocumentTranslations<string | null, "page">;
	"_related_page": Array<RelationFieldValue<"page">>;
	"_related_content": Array<RelationFieldValue<"page" | "blog">>;
	"sections": Array<{
		"_section_title": string | null;
	}>;
}`);
		expect(
			clientContent,
		).toContain(`export type PageCollectionDocumentFilters = {
	"id"?: FilterObject;
	"createdBy"?: FilterObject;
	"updatedBy"?: FilterObject;
	"createdAt"?: FilterObject;
	"updatedAt"?: FilterObject;
	"isDeleted"?: FilterObject;
	"deletedBy"?: FilterObject;
	"_page_title"?: FilterObject;
	"_related_page"?: FilterObject<number | number[] | \`page:\${number}\`> | {
		"page"?: {
			"_page_title"?: FilterObject;
			"_related_page"?: FilterObject<number | number[] | \`page:\${number}\`>;
			"_related_content"?: FilterObject<number | number[] | \`page:\${number}\` | \`blog:\${number}\`>;
			"fields"?: {
				"sections"?: {
					"_section_title"?: FilterObject;
				};
			};
			"banner"?: {
				"_title"?: FilterObject;
				"call_to_actions"?: {
					"_label"?: FilterObject;
				};
			};
		};
		"_page_title"?: FilterObject;
		"_related_page"?: FilterObject<number | number[] | \`page:\${number}\`>;
		"_related_content"?: FilterObject<number | number[] | \`page:\${number}\` | \`blog:\${number}\`>;
		"fields"?: {
			"sections"?: {
				"_section_title"?: FilterObject;
			};
		};
		"banner"?: {
			"_title"?: FilterObject;
			"call_to_actions"?: {
				"_label"?: FilterObject;
			};
		};
	};
	"_related_content"?: FilterObject<number | number[] | \`page:\${number}\` | \`blog:\${number}\`> | {
		"page"?: {
			"_page_title"?: FilterObject;
			"_related_page"?: FilterObject<number | number[] | \`page:\${number}\`>;
			"_related_content"?: FilterObject<number | number[] | \`page:\${number}\` | \`blog:\${number}\`>;
			"fields"?: {
				"sections"?: {
					"_section_title"?: FilterObject;
				};
			};
			"banner"?: {
				"_title"?: FilterObject;
				"call_to_actions"?: {
					"_label"?: FilterObject;
				};
			};
		};
		"_page_title"?: FilterObject;
		"_related_page"?: FilterObject<number | number[] | \`page:\${number}\`>;
		"_related_content"?: FilterObject<number | number[] | \`page:\${number}\` | \`blog:\${number}\`>;
		"fields"?: {
			"sections"?: {
				"_section_title"?: FilterObject;
			};
		};
		"banner"?: {
			"_title"?: FilterObject;
			"call_to_actions"?: {
				"_label"?: FilterObject;
			};
		};
	};
	"fields"?: {
		"sections"?: {
			"_section_title"?: FilterObject;
		};
	};
	"banner"?: {
		"_title"?: FilterObject;
		"call_to_actions"?: {
			"_label"?: FilterObject;
		};
	};
}`);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentSortKey = "createdAt" | "updatedAt" | "_page_title";`,
		);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentVersion = "latest" | "revision" | "snapshot" | "published";`,
		);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentVersionKey = "latest" | "published";`,
		);
		expect(clientContent).toContain(
			`export type GeneratedCollectionDocumentKey = Extract<keyof GeneratedCollectionDocumentFieldsByCollection, string>;`,
		);
		expect(clientContent).toContain(
			`export type CollectionDocumentKey = GeneratedCollectionDocumentKey | (string & {});`,
		);
		expect(
			clientContent,
		).toContain(`export type PageBannerBuilderBrickFields = {
	"title": CollectionDocumentTranslations<string | null, "page">;
	"call_to_actions": Array<{
		"label": string | null;
	}>;
}`);
		expect(clientContent).toContain(
			`export type CollectionDocument<TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey> = CoreCollectionDocument<TCollectionKey>;`,
		);
		expect(clientContent).toContain(
			`export type CollectionDocumentFilterInput<TCollectionKey extends string = string> = CoreCollectionDocumentFilterInput<TCollectionKey>;`,
		);
		expect(clientContent).not.toContain('"content_tab"');
		expect(clientContent).toContain("declare module '@lucidcms/core/types'");
		expect(clientContent).toContain("declare module '@lucidcms/client/types'");
		expect(clientContent).toContain(
			"interface CollectionDocumentFiltersByCollection extends GeneratedCollectionDocumentFiltersByCollection {}",
		);
		expect(clientContent).toContain(
			"interface CollectionDocumentVersionsByCollection extends GeneratedCollectionDocumentVersionsByCollection {}",
		);
		expect(clientContent).toContain(
			"interface CollectionDocumentSortsByCollection extends GeneratedCollectionDocumentSortsByCollection {}",
		);
		expect(clientContent).toContain(
			"interface CollectionDocumentVersionKeysByCollection extends GeneratedCollectionDocumentVersionKeysByCollection {}",
		);
		expect(clientContent).toContain(
			"interface CollectionDocumentLocaleCodesByCollection extends GeneratedCollectionDocumentLocaleCodesByCollection {}",
		);
	} finally {
		process.chdir(cwd);
		await rm(tempDir, { recursive: true, force: true });
	}
});
