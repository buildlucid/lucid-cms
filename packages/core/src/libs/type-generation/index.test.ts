import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import BrickBuilder from "../collection/builders/brick-builder/index.js";
import CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { adminText } from "../i18n/index.js";
import generateTypes from "./index.js";

test("generates collection-aware client document types that lean on the public Lucid contracts", async () => {
	const cwd = process.cwd();
	const tempDir = await mkdtemp(path.join(tmpdir(), "lucid-type-gen-"));
	const configPath = path.join(tempDir, "lucid.config.ts");

	await writeFile(configPath, "export default {};\n");

	const BannerBrick = new BrickBuilder("banner")
		.addTab("content_tab")
		.addText("title", {
			config: {
				localized: true,
			},
		})
		.addRepeater("call_to_actions")
		.addText("label", {
			config: {
				localized: false,
			},
		})
		.endRepeater();

	const PageCollection = new CollectionBuilder("page", {
		mode: "multiple",
		details: {
			name: adminText("tests.collections.page.name", { fallback: "Pages" }),
			singularName: adminText("tests.collections.page.singularName", {
				fallback: "Page",
			}),
		},
		config: {
			localized: true,
			environments: [
				{
					key: "published",
					name: adminText("tests.environments.published.name", {
						fallback: "Published",
					}),
				},
			],
		},
		bricks: {
			builder: [BannerBrick],
		},
	})
		.addText("_page_title", {
			config: {
				localized: true,
			},
		})
		.addDocument("_related_page", {
			collection: "page",
			config: {
				localized: false,
			},
		})
		.addDocument("_related_content", {
			collection: ["page", "blog"],
			config: {
				localized: false,
				multiple: true,
			},
		})
		.addRepeater("sections")
		.addText("_section_title", {
			config: {
				localized: false,
			},
		})
		.endRepeater();

	try {
		process.chdir(tempDir);

		await generateTypes({
			configPath,
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
	"_page_title": TranslatedDocumentField<"_page_title", "text", string | null>;
	"_related_page": ValueDocumentField<"_related_page", "document", Array<DocumentRelationValue<"page">>>;
	"_related_content": ValueDocumentField<"_related_content", "document", Array<DocumentRelationValue<"page" | "blog">>>;
	"sections": GroupDocumentField<"sections", "repeater", {
		"_section_title": ValueDocumentField<"_section_title", "text", string | null, true>;
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
	"title": TranslatedDocumentField<"title", "text", string | null>;
	"call_to_actions": GroupDocumentField<"call_to_actions", "repeater", {
		"label": ValueDocumentField<"label", "text", string | null, true>;
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
