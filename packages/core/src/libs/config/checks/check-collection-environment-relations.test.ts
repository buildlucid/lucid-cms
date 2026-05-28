import { describe, expect, it } from "vitest";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import { adminText, translateServer } from "../../i18n/index.js";
import checkCollectionEnvironmentRelations from "./check-collection-environment-relations.js";

const buildConfig = (collections: CollectionBuilder[]) =>
	({
		collections,
	}) as never;

describe("collection environment relation config checks", () => {
	it("allows latest and target collection environment mappings", () => {
		const pages = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: adminText("tests.collections.pages.name", { fallback: "Pages" }),
				singularName: adminText("tests.collections.pages.singularName", {
					fallback: "Page",
				}),
			},
			config: {
				environments: [
					{
						key: "staging",
						name: adminText("tests.environments.staging.name", {
							fallback: "Staging",
						}),
						relations: {
							blog: "signed-off",
							settings: "latest",
						},
					},
				],
			},
		});
		const blog = new CollectionBuilder("blog", {
			mode: "multiple",
			details: {
				name: adminText("tests.collections.blog.name", { fallback: "Blog" }),
				singularName: adminText("tests.collections.blog.singularName", {
					fallback: "Post",
				}),
			},
			config: {
				environments: [
					{
						key: "signed-off",
						name: adminText("tests.environments.signed-off.name", {
							fallback: "Signed off",
						}),
					},
				],
			},
		});
		const settings = new CollectionBuilder("settings", {
			mode: "single",
			details: {
				name: adminText("tests.collections.settings.name", {
					fallback: "Settings",
				}),
				singularName: adminText("tests.collections.settings.singularName", {
					fallback: "Settings",
				}),
			},
		});

		expect(() =>
			checkCollectionEnvironmentRelations(buildConfig([pages, blog, settings])),
		).not.toThrow();
	});

	it("throws when a mapping references an unknown collection", () => {
		const pages = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: adminText("tests.collections.pages.name", { fallback: "Pages" }),
				singularName: adminText("tests.collections.pages.singularName", {
					fallback: "Page",
				}),
			},
			config: {
				environments: [
					{
						key: "staging",
						name: adminText("tests.environments.staging.name", {
							fallback: "Staging",
						}),
						relations: {
							missing: "latest",
						},
					},
				],
			},
		});

		expect(() =>
			checkCollectionEnvironmentRelations(buildConfig([pages])),
		).toThrow(
			translateServer(
				"core.config.collection.environment.relation.collection.not.found",
				{
					collection: "pages",
					environment: "staging",
					targetCollection: "missing",
				},
			),
		);
	});

	it("throws when a mapping references an unknown target environment", () => {
		const pages = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: adminText("tests.collections.pages.name", { fallback: "Pages" }),
				singularName: adminText("tests.collections.pages.singularName", {
					fallback: "Page",
				}),
			},
			config: {
				environments: [
					{
						key: "staging",
						name: adminText("tests.environments.staging.name", {
							fallback: "Staging",
						}),
						relations: {
							blog: "signed-off",
						},
					},
				],
			},
		});
		const blog = new CollectionBuilder("blog", {
			mode: "multiple",
			details: {
				name: adminText("tests.collections.blog.name", { fallback: "Blog" }),
				singularName: adminText("tests.collections.blog.singularName", {
					fallback: "Post",
				}),
			},
			config: {
				environments: [
					{
						key: "production",
						name: adminText("tests.environments.production.name", {
							fallback: "Production",
						}),
					},
				],
			},
		});

		expect(() =>
			checkCollectionEnvironmentRelations(buildConfig([pages, blog])),
		).toThrow(
			translateServer(
				"core.config.collection.environment.relation.version.not.found",
				{
					collection: "pages",
					environment: "staging",
					targetCollection: "blog",
					targetVersion: "signed-off",
				},
			),
		);
	});
});
