import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = {
	checkFolderAccess: vi.fn(),
	checkCircularParents: vi.fn(),
	updateFolder: vi.fn(),
};

const loadUpdateSingle = async () => {
	vi.doMock("./checks/check-folder-access.js", () => ({
		default: mocks.checkFolderAccess,
	}));

	vi.doMock("../../libs/repositories/index.js", () => ({
		MediaFoldersRepository: class {
			checkCircularParents = mocks.checkCircularParents;
			updateSingle = mocks.updateFolder;
		},
	}));

	return (await import("./update-single.js")).default;
};

describe("media folder update single", () => {
	afterEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("updates an accessible folder", async () => {
		mocks.checkFolderAccess
			.mockResolvedValueOnce({
				error: undefined,
				data: {
					id: 1,
				},
			})
			.mockResolvedValueOnce({
				error: undefined,
				data: undefined,
			});
		mocks.updateFolder.mockResolvedValueOnce({
			error: undefined,
			data: {
				id: 1,
			},
		});

		const updateSingle = await loadUpdateSingle();
		const response = await updateSingle(
			{
				db: {
					client: {},
				},
				config: {
					db: {},
				},
			} as never,
			{
				id: 1,
				title: "Updated",
				parentFolderId: null,
				userId: 1,
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toBe(1);
		expect(mocks.updateFolder.mock.calls[0]?.[0].where).toEqual([
			{
				key: "id",
				operator: "=",
				value: 1,
			},
		]);
	});

	it("prevents a folder being moved under one of its descendants", async () => {
		mocks.checkFolderAccess
			.mockResolvedValueOnce({
				error: undefined,
				data: {
					id: 1,
				},
			})
			.mockResolvedValueOnce({
				error: undefined,
				data: {
					id: 2,
				},
			});
		mocks.checkCircularParents.mockResolvedValueOnce({
			error: undefined,
			data: true,
		});

		const updateSingle = await loadUpdateSingle();
		const response = await updateSingle(
			{
				db: {
					client: {},
				},
				config: {
					db: {},
				},
			} as never,
			{
				id: 1,
				parentFolderId: 2,
				userId: 1,
			},
		);

		expect(response.error?.status).toBe(400);
		expect(mocks.updateFolder).not.toHaveBeenCalled();
	});
});
