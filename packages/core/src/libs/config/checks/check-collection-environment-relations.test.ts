import { describe, expect, it } from "vitest";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import { copy, translate } from "../../i18n/index.js";
import checkCollectionEnvironmentRelations from "./check-collection-environment-relations.js";

const buildConfig = (collections: CollectionBuilder[]) =>
	({
		collections,
	}) as never;

describe("collection environment relation features checks", () => {
	it("allows latest and target collection environment mappings", () => {
		const pages = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
				singularName: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
			},
			environments: [
				{
					key: "staging",
					name: copy("admin:tests.environments.staging.name", {
						defaultMessage: "Staging",
					}),
					relations: {
						blog: "signed-off",
						settings: "latest",
					},
				},
			],
		});
		const blog = new CollectionBuilder("blog", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.blog.name", {
					defaultMessage: "Blog",
				}),
				singularName: copy("admin:tests.collections.blog.singularName", {
					defaultMessage: "Post",
				}),
			},
			environments: [
				{
					key: "signed-off",
					name: copy("admin:tests.environments.signed-off.name", {
						defaultMessage: "Signed off",
					}),
				},
			],
		});
		const settings = new CollectionBuilder("settings", {
			mode: "single",
			details: {
				name: copy("admin:tests.collections.settings.name", {
					defaultMessage: "Settings",
				}),
				singularName: copy("admin:tests.collections.settings.singularName", {
					defaultMessage: "Settings",
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
				name: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
				singularName: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
			},
			environments: [
				{
					key: "staging",
					name: copy("admin:tests.environments.staging.name", {
						defaultMessage: "Staging",
					}),
					relations: {
						missing: "latest",
					},
				},
			],
		});

		expect(() =>
			checkCollectionEnvironmentRelations(buildConfig([pages])),
		).toThrow(
			translate(
				"server:core.config.collection.environment.relation.collection.not.found",
				{
					data: {
						collection: "pages",
						environment: "staging",
						targetCollection: "missing",
					},
				},
			),
		);
	});

	it("throws when a mapping references an unknown target environment", () => {
		const pages = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
				singularName: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
			},
			environments: [
				{
					key: "staging",
					name: copy("admin:tests.environments.staging.name", {
						defaultMessage: "Staging",
					}),
					relations: {
						blog: "signed-off",
					},
				},
			],
		});
		const blog = new CollectionBuilder("blog", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.blog.name", {
					defaultMessage: "Blog",
				}),
				singularName: copy("admin:tests.collections.blog.singularName", {
					defaultMessage: "Post",
				}),
			},
			environments: [
				{
					key: "production",
					name: copy("admin:tests.environments.production.name", {
						defaultMessage: "Production",
					}),
				},
			],
		});

		expect(() =>
			checkCollectionEnvironmentRelations(buildConfig([pages, blog])),
		).toThrow(
			translate(
				"server:core.config.collection.environment.relation.version.not.found",
				{
					data: {
						collection: "pages",
						environment: "staging",
						targetCollection: "blog",
						targetVersion: "signed-off",
					},
				},
			),
		);
	});
});
