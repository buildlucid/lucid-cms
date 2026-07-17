import { afterEach, describe, expect, it, vi } from "vitest";
import constants from "../../../constants/constants.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";

const mocks = vi.hoisted(() => ({
	selectSingle: vi.fn(),
}));

vi.mock("../../../libs/repositories/index.js", () => ({
	DocumentPublishOperationsRepository: class {
		selectSingle = mocks.selectSingle;
	},
}));

import resolveRelationVersionType from "./resolve-relation-version-type.js";

const buildContext = (collections: CollectionBuilder[] = []) =>
	({
		db: {
			client: {},
		},
		config: {
			db: {},
			collections,
		},
	}) as never;

const createCollection = (
	key: string,
	environments: NonNullable<
		ConstructorParameters<typeof CollectionBuilder>[1]["environments"]
	> = [],
) =>
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
		environments,
	});

describe("resolve relation version type", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

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
				fieldType: "relation",
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("latest");
		expect(mocks.selectSingle).not.toHaveBeenCalled();
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
				fieldType: "relation",
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("latest");
		expect(mocks.selectSingle).not.toHaveBeenCalled();
	});

	it("uses explicit collection version mappings for target collections", async () => {
		const pages = createCollection("pages", [
			{
				key: "staging",
				name: copy("admin:tests.environments.staging.name", {
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
				name: copy("admin:tests.environments.signed-off.name", {
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
				fieldType: "relation",
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("signed-off");
		expect(mocks.selectSingle).not.toHaveBeenCalled();
	});

	it("uses same-named target environments when no explicit mapping exists", async () => {
		const pages = createCollection("pages", [
			{
				key: "staging",
				name: copy("admin:tests.environments.staging.name", {
					defaultMessage: "Staging",
				}),
			},
		]);
		const blog = createCollection("blog", [
			{
				key: "staging",
				name: copy("admin:tests.environments.staging.name", {
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
				fieldType: "relation",
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("staging");
	});

	it("falls cross-collection targets back to latest when the target lacks the requested environment", async () => {
		const pages = createCollection("pages", [
			{
				key: "staging",
				name: copy("admin:tests.environments.staging.name", {
					defaultMessage: "Staging",
				}),
			},
		]);
		const blog = createCollection("blog", [
			{
				key: "signed-off",
				name: copy("admin:tests.environments.signed-off.name", {
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
				fieldType: "relation",
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("latest");
	});

	it("hydrates operation-backed snapshots from the publish operation target", async () => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: {
				target: "staging",
			},
		});

		const response = await resolveRelationVersionType(buildContext(), {
			collectionKey: "pages",
			documentId: 1,
			versionId: 10,
			versionType: constants.collectionBuilder.publishing.snapshotVersionType,
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.versionType).toBe("staging");
		expect(
			response.data?.resolveVersionType?.({
				fieldType: "relation",
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("staging");
		expect(mocks.selectSingle).toHaveBeenCalledWith({
			select: ["target"],
			where: [
				{ key: "collection_key", operator: "=", value: "pages" },
				{ key: "document_id", operator: "=", value: 1 },
				{ key: "snapshot_version_id", operator: "=", value: 10 },
			],
		});
	});

	it("resolves snapshot relation targets from a version ID without a document ID", async () => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: { target: "staging" },
		});

		const response = await resolveRelationVersionType(buildContext(), {
			collectionKey: "pages",
			versionId: 10,
			versionType: constants.collectionBuilder.publishing.snapshotVersionType,
		});

		expect(response.data?.versionType).toBe("staging");
		expect(mocks.selectSingle).toHaveBeenCalledWith({
			select: ["target"],
			where: [
				{ key: "collection_key", operator: "=", value: "pages" },
				{ key: "snapshot_version_id", operator: "=", value: 10 },
			],
		});
	});

	it("applies explicit collection version mappings to operation-backed snapshots", async () => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: {
				target: "staging",
			},
		});
		const pages = createCollection("pages", [
			{
				key: "staging",
				name: copy("admin:tests.environments.staging.name", {
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
				name: copy("admin:tests.environments.signed-off.name", {
					defaultMessage: "Signed off",
				}),
			},
		]);

		const response = await resolveRelationVersionType(
			buildContext([pages, blog]),
			{
				collectionKey: "pages",
				documentId: 1,
				versionId: 10,
				versionType: constants.collectionBuilder.publishing.snapshotVersionType,
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.versionType).toBe("staging");
		expect(
			response.data?.resolveVersionType?.({
				fieldType: "relation",
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("signed-off");
	});

	it("falls orphan snapshots back to latest refs", async () => {
		mocks.selectSingle.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});

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
				fieldType: "relation",
				table: "lucid_document__blog",
				collectionKey: "blog",
			}),
		).toBe("latest");
	});
});
