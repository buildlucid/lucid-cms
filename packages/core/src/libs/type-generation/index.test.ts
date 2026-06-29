import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import BrickBuilder from "../collection/builders/brick-builder/index.js";
import CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { copy } from "../i18n/index.js";
import generateTypes from "./index.js";

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
			name: copy("admin:tests.collections.page.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.page.singularName", {
				defaultMessage: "Page",
			}),
		},
		localized: true,
		environments: [
			{
				key: "published",
				name: copy("admin:tests.environments.published.name", {
					defaultMessage: "Published",
				}),
			},
		],
		bricks: {
			builder: [BannerBrick],
		},
	})
		.addText("_page_title", {
			localized: true,
		})
		.addDocument("_related_page", {
			collection: "page",
			localized: false,
		})
		.addDocument("_related_content", {
			collection: ["page", "blog"],
			localized: false,
			multiple: true,
		})
		.addRepeater("sections")
		.addText("_section_title", {
			localized: false,
		})
		.endRepeater();

	try {
		process.chdir(tempDir);

		await generateTypes({
			configPath,
			projectRoot: tempDir,
			collections: [PageCollection],
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
		expect(clientContent).toContain(
			`export interface GeneratedCollectionDocumentLocaleCodes {
	"en": true;
	"fr": true;
}`,
		);
		expect(clientContent).toContain(
			`export type GeneratedCollectionDocumentLocaleCode = Extract<keyof GeneratedCollectionDocumentLocaleCodes, string>;`,
		);
		expect(clientContent).toContain(
			`export type CollectionDocumentLocaleCode = GeneratedCollectionDocumentLocaleCode | (string & {});`,
		);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentFields = {
	"_page_title": CollectionDocumentTranslations<string | null>;
	"_related_page": Array<DocumentRelationValue<"page">>;
	"_related_content": Array<DocumentRelationValue<"page" | "blog">>;
	"sections": Array<{
		"_section_title": string | null;
	}>;
}`,
		);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentFilters = {
	"id"?: FilterObject;
	"createdBy"?: FilterObject;
	"updatedBy"?: FilterObject;
	"createdAt"?: FilterObject;
	"updatedAt"?: FilterObject;
	"isDeleted"?: FilterObject;
	"deletedBy"?: FilterObject;
	"_page_title"?: FilterObject;
	"_related_page"?: FilterObject;
	"_related_content"?: FilterObject;
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
}`,
		);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentSortKey = "createdAt" | "updatedAt";`,
		);
		expect(clientContent).toContain(
			`export type PageCollectionDocumentStatus = "latest" | "revision" | "published";`,
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
		expect(clientContent).toContain(
			`export type PageBannerBuilderBrickFields = {
	"title": CollectionDocumentTranslations<string | null>;
	"call_to_actions": Array<{
		"label": string | null;
	}>;
}`,
		);
		expect(clientContent).toContain(
			`export type CollectionDocument<TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey> = CoreCollectionDocument<TCollectionKey>;`,
		);
		expect(clientContent).not.toContain('"content_tab"');
		expect(clientContent).toContain("declare module '@lucidcms/core/types'");
		expect(clientContent).toContain("declare module '@lucidcms/client/types'");
		expect(clientContent).toContain(
			"interface CollectionDocumentFiltersByCollection extends GeneratedCollectionDocumentFiltersByCollection {}",
		);
		expect(clientContent).toContain(
			"interface CollectionDocumentStatusesByCollection extends GeneratedCollectionDocumentStatusesByCollection {}",
		);
		expect(clientContent).toContain(
			"interface CollectionDocumentSortsByCollection extends GeneratedCollectionDocumentSortsByCollection {}",
		);
		expect(clientContent).toContain(
			"interface CollectionDocumentVersionKeysByCollection extends GeneratedCollectionDocumentVersionKeysByCollection {}",
		);
		expect(clientContent).toContain(
			"interface CollectionDocumentLocaleCodes extends GeneratedCollectionDocumentLocaleCodes {}",
		);
	} finally {
		process.chdir(cwd);
		await rm(tempDir, { recursive: true, force: true });
	}
});
