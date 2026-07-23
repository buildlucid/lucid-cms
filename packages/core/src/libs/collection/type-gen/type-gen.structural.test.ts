import { expect, test } from "vitest";
import { copy } from "../../i18n/index.js";
import CollectionBuilder from "../builders/collection-builder/index.js";
import generateCollectionClientTypes from "./index.js";

const buildCollection = (key: string) =>
	new CollectionBuilder(key, {
		mode: "multiple",
		details: {
			name: copy(`admin:tests.collections.${key}.name`, {
				defaultMessage: key,
			}),
			singularName: copy(`admin:tests.collections.${key}.singularName`, {
				defaultMessage: key,
			}),
		},
	});

test("client types nest section children and inline collapsible children", async () => {
	const collection = buildCollection("nav")
		.addText("title")
		.addSection("badge")
		.addText("label")
		.endSection()
		.addCollapsible("advanced", { output: "inline" })
		.addText("anchorLabel")
		.endCollapsible();

	const file = generateCollectionClientTypes({
		collections: [collection],
		localization: { locales: [{ code: "en" }] },
	});

	const fieldsDeclaration = file.declarations.find(
		(declaration) =>
			declaration.startsWith("export type Nav") &&
			declaration.includes("CollectionDocumentFields ="),
	);

	expect(fieldsDeclaration).toBeDefined();
	//* nested sections become an object property under the section key
	expect(fieldsDeclaration).toMatch(/"badge": \{/);
	expect(fieldsDeclaration).toMatch(/"label":/);
	//* inline collapsibles flatten their children to the containing level
	expect(fieldsDeclaration).not.toMatch(/"advanced"/);
	expect(fieldsDeclaration).toMatch(/"anchorLabel":/);
});

test("sort key types only include order for orderable collections", async () => {
	const orderable = new CollectionBuilder("projects", {
		mode: "multiple",
		orderable: true,
		details: {
			name: copy("admin:tests.collections.projects.name", {
				defaultMessage: "projects",
			}),
			singularName: copy("admin:tests.collections.projects.singularName", {
				defaultMessage: "project",
			}),
		},
	});
	const standard = buildCollection("pages");

	const file = generateCollectionClientTypes({
		collections: [orderable, standard],
		localization: { locales: [{ code: "en" }] },
	});

	const orderableSortDeclaration = file.declarations.find((declaration) =>
		declaration.startsWith("export type ProjectsCollectionDocumentSortKey ="),
	);
	const standardSortDeclaration = file.declarations.find((declaration) =>
		declaration.startsWith("export type PagesCollectionDocumentSortKey ="),
	);

	expect(orderableSortDeclaration).toContain('"order"');
	expect(standardSortDeclaration).toBeDefined();
	expect(standardSortDeclaration).not.toContain('"order"');
});

test("sort key types include sortable top-level custom fields regardless of listing", async () => {
	const collection = buildCollection("articles")
		.addText("title", { showInList: true })
		.addTextarea("summary")
		.addNumber("views")
		.addDateTime("publishedAt")
		.addSelect("category", {
			options: [
				{
					label: copy("admin:tests.collections.articles.category", {
						defaultMessage: "News",
					}),
					value: "news",
				},
			],
		})
		.addCheckbox("featured")
		.addMedia("hero")
		.addRepeater("items")
		.addText("itemLabel")
		.endRepeater();

	const file = generateCollectionClientTypes({
		collections: [collection],
		localization: { locales: [{ code: "en" }] },
	});

	const sortDeclaration = file.declarations.find((declaration) =>
		declaration.startsWith("export type ArticlesCollectionDocumentSortKey ="),
	);

	expect(sortDeclaration).toBeDefined();
	//* sortable types are included even when unlisted
	expect(sortDeclaration).toContain('"_title"');
	expect(sortDeclaration).toContain('"_summary"');
	expect(sortDeclaration).toContain('"_views"');
	expect(sortDeclaration).toContain('"_publishedAt"');
	expect(sortDeclaration).toContain('"_category"');
	expect(sortDeclaration).toContain('"_featured"');
	//* unsupported types are excluded
	expect(sortDeclaration).not.toContain('"_hero"');
	expect(sortDeclaration).not.toContain('"_items"');
	expect(sortDeclaration).not.toContain('"_itemLabel"');
	//* core sort keys remain
	expect(sortDeclaration).toContain('"createdAt"');
	expect(sortDeclaration).toContain('"updatedAt"');
});

test("client types keep collection tabs transparent", async () => {
	const collection = buildCollection("pages")
		.addTab("contentTab")
		.addText("title")
		.addTab("seoTab")
		.addText("metaTitle");

	const file = generateCollectionClientTypes({
		collections: [collection],
		localization: { locales: [{ code: "en" }] },
	});

	const fieldsDeclaration = file.declarations.find(
		(declaration) =>
			declaration.startsWith("export type Pages") &&
			declaration.includes("CollectionDocumentFields ="),
	);

	expect(fieldsDeclaration).toBeDefined();
	expect(fieldsDeclaration).toMatch(/"title":/);
	expect(fieldsDeclaration).toMatch(/"metaTitle":/);
	expect(fieldsDeclaration).not.toMatch(/"contentTab"/);
});
