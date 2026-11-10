import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import defineBrick from "../collection/define-brick.js";
import defineCollection from "../collection/define-collection.js";
import field from "../collection/definitions/fields/field.js";
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
		expect(generated.match(/declare module '[^']+'/g)).toEqual([
			"declare module '@lucidcms/core/types'",
		]);
		expect(generated.match(/"reports:read": true;/g)).toHaveLength(1);
		expect(generated.match(/"exports:read": true;/g)).toHaveLength(1);
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
	await writeFile(
		path.join(translationsDir, "fr.site.json"),
		JSON.stringify({
			"nav.home": "Accueil",
		}),
	);

	const BannerBrick = defineBrick({
		key: "banner",
		fields: [
			field.tab("content_tab", {
				fields: [
					field.text("title", {
						localized: true,
					}),
					field.repeater("call_to_actions", {
						fields: [
							field.text("label", {
								localized: false,
							}),
						],
					}),
				],
			}),
		],
	});

	const PageCollection = defineCollection({
		key: "page",
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
			environments: [
				{
					key: "published",
					label: copy("admin:tests.environments.published.name", {
						defaultMessage: "Published",
					}),
				},
			],
		},
		fields: [
			field.text("_page_title", {
				localized: true,
			}),
			field.relation("_related_page", {
				collection: "page",
				localized: false,
			}),
			field.relation("_related_content", {
				collection: ["page", "blog"],
				localized: false,
				multiple: true,
			}),
			field.repeater("sections", {
				fields: [
					field.text("_section_title", {
						localized: false,
					}),
				],
			}),
		],
	});
	const ArticleCollection = defineCollection({
		key: "article",
		mode: "multiple",
		details: {
			labels: {
				singular: "Article",
				plural: "Articles",
			},
		},
		localized: { locales: ["de"], defaultLocale: "de" },
		fields: [field.text("title", { localized: true })],
	});

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
			clientTypes: ["site/lucid.d.ts"],
		});

		const typesContent = await readFile(
			path.join(tempDir, ".lucid", "types.d.ts"),
			"utf8",
		);
		const clientContent = await readFile(
			path.join(tempDir, ".lucid", "client.d.ts"),
			"utf8",
		);
		const writesContent = await readFile(
			path.join(tempDir, ".lucid", "writes.d.ts"),
			"utf8",
		);
		const siteClientContent = await readFile(
			path.join(tempDir, "site", "lucid.d.ts"),
			"utf8",
		);

		expect(typesContent).toContain('/// <reference path="./client.d.ts" />');
		expect(typesContent).toContain('/// <reference path="./writes.d.ts" />');
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
		expect(typesContent).toMatch(
			/`site:\$\{Extract<keyof typeof translationSource3, string>\}`/,
		);
		expect(typesContent).toContain(
			"interface TranslationKeys extends Record<GeneratedTranslationKey, true> {}",
		);
		expect(typesContent).not.toContain('"admin:custom.admin.title": true;');
		expect(typesContent).not.toContain('"server:custom.server.error": true;');
		expect(clientContent).toContain(`from "@lucidcms/core/types";`);
		expect(clientContent)
			.toContain(`export type PageCollectionDocumentFields = {
	"_page_title": CollectionDocumentTranslations<string | null, "page">;
	"_related_page": Array<RelationFieldValue<"page">>;
	"_related_content": Array<RelationFieldValue<"page" | "blog">>;
	"sections": Array<{
		"_section_title": string | null;
	}>;
}`);
		expect(clientContent)
			.toContain(`export type PageCollectionDocumentFilters = {
	"id"?: FilterCondition;
	"createdBy"?: FilterCondition;
	"updatedBy"?: FilterCondition;
	"createdAt"?: FilterCondition;
	"updatedAt"?: FilterCondition;
	"fields"?: {
		"_page_title"?: FilterCondition;
		"_related_page"?: FilterCondition<number | number[] | \`page:\${number}\`> | {
			"page"?: {
				"fields"?: {
					"_page_title"?: FilterCondition;
					"_related_page"?: FilterCondition<number | number[] | \`page:\${number}\`>;
					"_related_content"?: FilterCondition<number | number[] | \`page:\${number}\` | \`blog:\${number}\`>;
					"_section_title"?: FilterCondition;
				};
				"bricks"?: {
					"banner"?: {
						"title"?: FilterCondition;
						"label"?: FilterCondition;
					};
				};
			};
			"fields"?: {
				"_page_title"?: FilterCondition;
				"_related_page"?: FilterCondition<number | number[] | \`page:\${number}\`>;
				"_related_content"?: FilterCondition<number | number[] | \`page:\${number}\` | \`blog:\${number}\`>;
				"_section_title"?: FilterCondition;
			};
			"bricks"?: {
				"banner"?: {
					"title"?: FilterCondition;
					"label"?: FilterCondition;
				};
			};
		};
		"_related_content"?: FilterCondition<number | number[] | \`page:\${number}\` | \`blog:\${number}\`> | {
			"page"?: {
				"fields"?: {
					"_page_title"?: FilterCondition;
					"_related_page"?: FilterCondition<number | number[] | \`page:\${number}\`>;
					"_related_content"?: FilterCondition<number | number[] | \`page:\${number}\` | \`blog:\${number}\`>;
					"_section_title"?: FilterCondition;
				};
				"bricks"?: {
					"banner"?: {
						"title"?: FilterCondition;
						"label"?: FilterCondition;
					};
				};
			};
			"fields"?: {
				"_page_title"?: FilterCondition;
				"_related_page"?: FilterCondition<number | number[] | \`page:\${number}\`>;
				"_related_content"?: FilterCondition<number | number[] | \`page:\${number}\` | \`blog:\${number}\`>;
				"_section_title"?: FilterCondition;
			};
			"bricks"?: {
				"banner"?: {
					"title"?: FilterCondition;
					"label"?: FilterCondition;
				};
			};
		};
		"_section_title"?: FilterCondition;
	};
	"bricks"?: {
		"banner"?: {
			"title"?: FilterCondition;
			"label"?: FilterCondition;
		};
	};
}`);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentSortKey = "createdAt" | "updatedAt" | "fields._page_title";`,
		);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentVersion = "latest" | "revision" | "snapshot" | "published";`,
		);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentVersionKey = "latest" | "published";`,
		);
		expect(clientContent)
			.toContain(`export type PageBannerBuilderBrickFields = {
	"title": CollectionDocumentTranslations<string | null, "page">;
	"call_to_actions": Array<{
		"label": string | null;
	}>;
}`);
		expect(clientContent).not.toContain('"content_tab"');
		expect(clientContent.match(/declare module '[^']+'/g)).toEqual([
			"declare module '@lucidcms/core/types'",
		]);
		expect(clientContent).toContain(`declare module '@lucidcms/core/types' {
	interface Collections {
		"page": {
			fields: PageCollectionDocumentFields;
			bricks: PageCollectionDocumentBrick;
			locales: "en" | "fr";
			filters: PageCollectionDocumentFilters;
			sorts: PageCollectionDocumentSortKey;
			versions: PageCollectionDocumentVersion;
			versionKeys: PageCollectionDocumentVersionKey;
		};
		"article": {
			fields: ArticleCollectionDocumentFields;
			bricks: ArticleCollectionDocumentBrick;
			locales: "de";
			filters: ArticleCollectionDocumentFilters;
			sorts: ArticleCollectionDocumentSortKey;
			versions: ArticleCollectionDocumentVersion;
			versionKeys: ArticleCollectionDocumentVersionKey;
		};
	}
}`);
		expect(clientContent.match(/^\tinterface \w+/gm)).toEqual([
			"\tinterface Collections",
		]);
		expect(writesContent.match(/declare module '[^']+'/g)).toEqual([
			"declare module '@lucidcms/core/types'",
		]);
		expect(writesContent.match(/^\tinterface \w+/gm)).toEqual([
			"\tinterface CollectionWrites",
		]);
		expect(siteClientContent).toBe(
			clientContent.replaceAll(
				"@lucidcms/core/types",
				"@lucidcms/client/types",
			),
		);
		expect(siteClientContent).toContain(`from "@lucidcms/client/types";`);
		expect(siteClientContent).toContain(
			"declare module '@lucidcms/client/types'",
		);
	} finally {
		process.chdir(cwd);
		await rm(tempDir, { recursive: true, force: true });
	}
});
