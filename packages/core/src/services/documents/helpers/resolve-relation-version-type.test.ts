import { describe, expect, it } from "vitest";
import constants from "../../../constants/constants.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";

import resolveRelationVersionType from "./resolve-relation-version-type.js";

const buildContext = (collections: CollectionBuilder[] = []) =>
	({
		db: {},
		config: {
			db: {},
			collections,
		},
	}) as never;

const createCollection = (
	key: string,
	environments: NonNullable<
		ConstructorParameters<typeof CollectionBuilder>[1]["publishing"]["targets"]
	> = [],
) =>
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
		publishing: { targets: environments },
	});

describe("resolve relation version type", () => {
	it("hydrates latest documents from latest refs", async () => {
		const response = await resolveRelationVersionType(buildContext(), {
			collectionKey: "pages",
			documentId: 1,
			versionId: 10,
			versionType: "latest",
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.versionType).toBe("latest");
		expect(
			response.data?.resolveVersionType?.({
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("latest");
	});

	it("hydrates revision documents from latest refs", async () => {
		const response = await resolveRelationVersionType(buildContext(), {
			collectionKey: "pages",
			documentId: 1,
			versionId: 10,
			versionType: "revision",
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.versionType).toBe("latest");
		expect(
			response.data?.resolveVersionType?.({
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("latest");
	});

	it("uses explicit collection version mappings for target collections", async () => {
		const pages = createCollection("pages", [
			{
				key: "staging",
				label: copy("admin:tests.environments.staging.name", {
					defaultMessage: "Staging",
				}),
				collectionVersions: {
					blog: "signed-off",
				},
			},
		]);
		const blog = createCollection("blog", [
			{
				key: "signed-off",
				label: copy("admin:tests.environments.signed-off.name", {
					defaultMessage: "Signed off",
				}),
			},
		]);

		const response = await resolveRelationVersionType(
			buildContext([pages, blog]),
			{
				collectionKey: "pages",
				versionType: "staging",
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.versionType).toBe("staging");
		expect(
			response.data?.resolveVersionType?.({
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("signed-off");
	});

	it("uses same-named target environments when no explicit mapping exists", async () => {
		const pages = createCollection("pages", [
			{
				key: "staging",
				label: copy("admin:tests.environments.staging.name", {
					defaultMessage: "Staging",
				}),
			},
		]);
		const blog = createCollection("blog", [
			{
				key: "staging",
				label: copy("admin:tests.environments.staging.name", {
					defaultMessage: "Staging",
				}),
			},
		]);

		const response = await resolveRelationVersionType(
			buildContext([pages, blog]),
			{
				collectionKey: "pages",
				versionType: "staging",
			},
		);

		expect(response.error).toBeUndefined();
		expect(
			response.data?.resolveVersionType?.({
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("staging");
	});

	it("falls cross-collection targets back to latest when the target lacks the requested environment", async () => {
		const pages = createCollection("pages", [
			{
				key: "staging",
				label: copy("admin:tests.environments.staging.name", {
					defaultMessage: "Staging",
				}),
			},
		]);
		const blog = createCollection("blog", [
			{
				key: "signed-off",
				label: copy("admin:tests.environments.signed-off.name", {
					defaultMessage: "Signed off",
				}),
			},
		]);

		const response = await resolveRelationVersionType(
			buildContext([pages, blog]),
			{
				collectionKey: "pages",
				versionType: "staging",
			},
		);

		expect(response.error).toBeUndefined();
		expect(
			response.data?.resolveVersionType?.({
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("latest");
	});

	it("falls orphan snapshots back to latest refs", async () => {
		const response = await resolveRelationVersionType(buildContext(), {
			collectionKey: "pages",
			documentId: 1,
			versionId: 10,
			versionType: constants.collectionBuilder.publishing.snapshotVersionType,
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.versionType).toBe("latest");
		expect(
			response.data?.resolveVersionType?.({
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("latest");
	});
});
