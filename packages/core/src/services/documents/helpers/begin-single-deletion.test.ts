import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getCollection: vi.fn(),
	getTableNames: vi.fn(),
	selectSingle: vi.fn(),
	checkDocumentAccess: vi.fn(),
	executeDeleteHook: vi.fn(),
}));

vi.mock("../../../libs/collection/collections.js", () => ({
	default: {
		getSingle: mocks.getCollection,
	},
}));

vi.mock(
	"../../../libs/collection/schema/runtime/runtime-schema-selectors.js",
	() => ({
		getTableNames: mocks.getTableNames,
	}),
);

vi.mock("../../../libs/repositories/index.js", () => ({
	DocumentsRepository: class {
		selectSingle = mocks.selectSingle;
	},
}));

vi.mock("../checks/check-document-access.js", () => ({
	default: mocks.checkDocumentAccess,
}));

vi.mock("./execute-delete-hook.js", () => ({
	default: mocks.executeDeleteHook,
}));

import beginSingleDeletion from "./begin-single-deletion.js";

const collection = {
	key: "pages",
	getData: {
		locked: false,
	},
};
const tableNames = {
	document: "lucid_document__pages",
};
const context = {
	db: {
		client: {},
	},
	config: {
		db: {
			getDefault: vi.fn().mockReturnValue(0),
		},
	},
} as never;

const mockSuccessfulPreparation = () => {
	mocks.getCollection.mockResolvedValueOnce({
		error: undefined,
		data: collection,
	});
	mocks.getTableNames.mockResolvedValueOnce({
		error: undefined,
		data: tableNames,
	});
	mocks.checkDocumentAccess.mockResolvedValueOnce({
		error: undefined,
		data: undefined,
	});
	mocks.selectSingle.mockResolvedValueOnce({
		error: undefined,
		data: { id: 12 },
	});
	mocks.executeDeleteHook.mockResolvedValueOnce({
		error: undefined,
		data: undefined,
	});
};

describe("beginSingleDeletion", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("prepares an active soft deletion and executes its before hook", async () => {
		mockSuccessfulPreparation();

		const response = await beginSingleDeletion(context, {
			id: 12,
			collectionKey: "pages",
			userId: 4,
			hardDelete: false,
			activeOnly: true,
			rejectLocked: true,
		});

		expect(response.error).toBeUndefined();
		expect(mocks.selectSingle).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.arrayContaining([
					expect.objectContaining({ key: "is_deleted", value: 0 }),
				]),
			}),
			{ tableName: tableNames.document },
		);
		expect(mocks.executeDeleteHook).toHaveBeenCalledWith(
			context,
			expect.objectContaining({
				event: "beforeDelete",
				ids: [12],
				hardDelete: false,
			}),
		);
	});

	it("does not apply the active-only filter to a hard deletion", async () => {
		mockSuccessfulPreparation();

		await beginSingleDeletion(context, {
			id: 12,
			collectionKey: "pages",
			userId: 4,
			hardDelete: true,
		});

		const query = mocks.selectSingle.mock.calls[0]?.[0];
		expect(query.where).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ key: "is_deleted" })]),
		);
		expect(mocks.executeDeleteHook).toHaveBeenCalledWith(
			context,
			expect.objectContaining({ hardDelete: true }),
		);
	});

	it("rejects locked collections before preparing the deletion", async () => {
		mocks.getCollection.mockResolvedValueOnce({
			error: undefined,
			data: {
				...collection,
				getData: { locked: true },
			},
		});

		const response = await beginSingleDeletion(context, {
			id: 12,
			collectionKey: "pages",
			userId: 4,
			hardDelete: false,
			rejectLocked: true,
		});

		expect(response.error?.status).toBe(400);
		expect(mocks.getTableNames).not.toHaveBeenCalled();
		expect(mocks.executeDeleteHook).not.toHaveBeenCalled();
	});
});
