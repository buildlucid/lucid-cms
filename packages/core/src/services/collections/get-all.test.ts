import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getCollections: vi.fn(),
	getDocumentTableSchema: vi.fn(),
	primeRuntimeSchemas: vi.fn(),
	selectMultipleUnion: vi.fn(),
}));

vi.mock("../../libs/collection/collections.js", () => ({
	default: {
		getAll: mocks.getCollections,
	},
}));

vi.mock(
	"../../libs/collection/schema/runtime/prime-runtime-schemas.js",
	() => ({
		default: mocks.primeRuntimeSchemas,
	}),
);

vi.mock(
	"../../libs/collection/schema/runtime/runtime-schema-selectors.js",
	() => ({
		getDocumentTableSchema: mocks.getDocumentTableSchema,
	}),
);

vi.mock("../../libs/repositories/index.js", () => ({
	DocumentsRepository: class {
		selectMultipleUnion = mocks.selectMultipleUnion;
	},
}));

import getAll from "./get-all.js";

const context = {
	db: {},
	config: {
		i18n: {
			defaultLocale: "en",
		},
	},
	translate: {
		forLocale: () => ({
			adminBundle: () => ({}),
		}),
	},
} as never;

describe("collection get all", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getCollections.mockResolvedValue({
			error: undefined,
			data: [
				{
					key: "pages",
					getData: { mode: "single" },
				},
			],
		});
	});

	it("returns runtime schema priming failures", async () => {
		const error = {
			message: "Unable to prime runtime schemas",
		};
		mocks.primeRuntimeSchemas.mockResolvedValue({
			data: undefined,
			error,
		});

		const response = await getAll(context, {
			includeDocumentId: true,
		});

		expect(response).toEqual({ data: undefined, error });
		expect(mocks.selectMultipleUnion).not.toHaveBeenCalled();
	});
});
