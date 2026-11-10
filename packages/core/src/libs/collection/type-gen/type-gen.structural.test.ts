import { expect, test } from "vitest";
import { copy } from "../../i18n/index.js";
import CollectionBuilder from "../builders/collection-builder/index.js";
import generateCollectionTypes from "./index.js";

const buildCollection = (key: string) =>
	new CollectionBuilder(key, {
		mode: "multiple",
		details: {
			labels: {
				singular: copy(`admin:tests.collections.${key}.singularName`, {
					defaultMessage: key,
				}),
				plural: copy(`admin:tests.collections.${key}.name`, {
					defaultMessage: key,
				}),
			},
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

	const { client: file } = generateCollectionTypes({
		collections: [collection],
		localization: { locales: [{ code: "en" }], defaultLocale: "en" },
	});

	const fieldsDeclaration = file.declarations?.find(
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
			labels: {
				singular: copy("admin:tests.collections.projects.singularName", {
					defaultMessage: "project",
				}),
				plural: copy("admin:tests.collections.projects.name", {
					defaultMessage: "projects",
				}),
			},
		},
	});
	const standard = buildCollection("pages");

	const { client: file } = generateCollectionTypes({
		collections: [orderable, standard],
		localization: { locales: [{ code: "en" }], defaultLocale: "en" },
	});

	const orderableSortDeclaration = file.declarations?.find((declaration) =>
		declaration.startsWith("export type ProjectsCollectionDocumentSortKey ="),
	);
	const standardSortDeclaration = file.declarations?.find((declaration) =>
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

	const { client: file } = generateCollectionTypes({
		collections: [collection],
		localization: { locales: [{ code: "en" }], defaultLocale: "en" },
	});

	const sortDeclaration = file.declarations?.find((declaration) =>
		declaration.startsWith("export type ArticlesCollectionDocumentSortKey ="),
	);

	expect(sortDeclaration).toBeDefined();
	//* sortable types are included even when unlisted
	expect(sortDeclaration).toContain('"fields.title"');
	expect(sortDeclaration).toContain('"fields.summary"');
	expect(sortDeclaration).toContain('"fields.views"');
	expect(sortDeclaration).toContain('"fields.publishedAt"');
	expect(sortDeclaration).toContain('"fields.category"');
	expect(sortDeclaration).toContain('"fields.featured"');
	//* unsupported types are excluded
	expect(sortDeclaration).not.toContain('"fields.hero"');
	expect(sortDeclaration).not.toContain('"fields.items"');
	expect(sortDeclaration).not.toContain('"fields.itemLabel"');
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

	const { client: file } = generateCollectionTypes({
		collections: [collection],
		localization: { locales: [{ code: "en" }], defaultLocale: "en" },
	});

	const fieldsDeclaration = file.declarations?.find(
		(declaration) =>
			declaration.startsWith("export type Pages") &&
			declaration.includes("CollectionDocumentFields ="),
	);

	expect(fieldsDeclaration).toBeDefined();
	expect(fieldsDeclaration).toMatch(/"title":/);
	expect(fieldsDeclaration).toMatch(/"metaTitle":/);
	expect(fieldsDeclaration).not.toMatch(/"contentTab"/);
});
