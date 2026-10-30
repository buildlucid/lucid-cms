import { describe, expect, test } from "vitest";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import getContentAccess from "../../../libs/collection/field-access/get-content-access.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { recursiveFieldValidate } from "../checks/check-validate-bricks-fields.js";
import restrictValidationData from "./restrict-validation-data.js";

const collection = new CollectionBuilder("pages", {
	mode: "multiple",
	details: { labels: { singular: "Page", plural: "Pages" } },
});
const settings = new CollectionBuilder("settings", {
	mode: "single",
	details: { labels: { singular: "Settings", plural: "Settings" } },
});

//* only the collections are read until a stored version is needed
const context = {
	config: { collections: [collection, settings] },
} as ServiceContext;

const validationData = {
	relation: [
		{ id: 1, collection_key: "pages" },
		{ id: 2, collection_key: "settings" },
	],
	media: [
		{ id: 3, created_by: 2 },
		{ id: 6, created_by: 1 },
	],
	email: [{ id: 4, type: "external" }],
	user: [{ id: 5 }],
};

const editor = (permissions: string[]): LucidUser => ({
	id: 1,
	username: "editor",
	email: "editor@example.test",
	superAdmin: false,
	permissions: permissions as LucidUser["permissions"],
});

describe("restrictValidationData", () => {
	test("new links need read access to their documents, media and emails, apart from media the editor uploaded", async () => {
		const result = await restrictValidationData(context, {
			validationData,
			authUser: editor(["documents:pages:read"]),
			access: getContentAccess(collection, editor([])),
			collection,
		});

		expect(result.data).toEqual({
			relation: [{ id: 1, collection_key: "pages" }],
			media: [{ id: 6, created_by: 1 }],
			email: [],
			user: [{ id: 5 }],
		});
	});

	test("read permissions keep their targets", async () => {
		const result = await restrictValidationData(context, {
			validationData,
			authUser: editor([
				"documents:pages:read",
				"documents:settings:read",
				Permissions.MediaRead,
				Permissions.EmailRead,
			]),
			access: getContentAccess(collection, editor([])),
			collection,
		});

		expect(result.data).toEqual(validationData);
	});

	test("only reads the previous version when a link would be dropped", async () => {
		//* the empty context throws if the stored version is read
		const result = await restrictValidationData(context, {
			validationData: { relation: [{ id: 1, collection_key: "pages" }] },
			authUser: editor(["documents:pages:read"]),
			access: getContentAccess(collection, editor([])),
			collection,
			existingVersion: { id: 1, documentId: 1 },
		});

		expect(result.error).toBeUndefined();
	});

	test("rich text links need the same read access, including targets it could keep while missing", async () => {
		const richText = {
			documents: [{ id: 2, collection_key: "settings" }],
			media: [{ id: 3, created_by: 2 }],
			users: [],
			collections: {},
			embeddedBricks: {},
			cyclicEmbeddedBricks: [],
			retainedReferences: {
				media: new Map([["lucid_media", new Set([9])]]),
			},
		};

		const result = await restrictValidationData(context, {
			validationData: { "rich-text": richText },
			authUser: editor([]),
			access: getContentAccess(collection, editor([])),
			collection,
		});

		expect(result.data?.["rich-text"]).toEqual({
			...richText,
			documents: [],
			media: [],
			retainedReferences: {},
		});
	});

	test("hidden fields validate with their stored links, while visible ones only accept readable targets", () => {
		const restricted = new CollectionBuilder("pages", {
			mode: "multiple",
			details: { labels: { singular: "Page", plural: "Pages" } },
		})
			.addRelation("visible", { collection: "settings" })
			.addRelation("hidden", {
				collection: "settings",
				permissions: { read: true },
			});
		const validate = (key: string) =>
			recursiveFieldValidate({
				fields: [
					{
						key,
						type: "relation",
						value: [{ id: 2, collectionKey: "settings" }],
					},
				],
				instance: restricted,
				validationData: { relation: [{ id: 2, collection_key: "settings" }] },
				restricted: {
					validationData: { relation: [] },
					access: getContentAccess(restricted, editor([])).fields,
				},
				meta: { localized: false, defaultLocale: "en" },
			});

		expect(validate("hidden")).toEqual([]);
		expect(validate("visible")).toHaveLength(1);
	});
});
