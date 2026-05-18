import { describe, expect, it } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
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
				name: "Pages",
				singularName: "Page",
			},
			config: {
				environments: [
					{
						key: "staging",
						name: "Staging",
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
				name: "Blog",
				singularName: "Post",
			},
			config: {
				environments: [
					{
						key: "signed-off",
						name: "Signed off",
					},
				],
			},
		});
		const settings = new CollectionBuilder("settings", {
			mode: "single",
			details: {
				name: "Settings",
				singularName: "Settings",
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
				name: "Pages",
				singularName: "Page",
			},
			config: {
				environments: [
					{
						key: "staging",
						name: "Staging",
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
			T("config_collection_environment_relation_collection_not_found", {
				collection: "pages",
				environment: "staging",
				targetCollection: "missing",
			}),
		);
	});

	it("throws when a mapping references an unknown target environment", () => {
		const pages = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: "Pages",
				singularName: "Page",
			},
			config: {
				environments: [
					{
						key: "staging",
						name: "Staging",
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
				name: "Blog",
				singularName: "Post",
			},
			config: {
				environments: [
					{
						key: "production",
						name: "Production",
					},
				],
			},
		});

		expect(() =>
			checkCollectionEnvironmentRelations(buildConfig([pages, blog])),
		).toThrow(
			T("config_collection_environment_relation_version_not_found", {
				collection: "pages",
				environment: "staging",
				targetCollection: "blog",
				targetVersion: "signed-off",
			}),
		);
	});
});
