import { describe, expect, test } from "vitest";
import type { PageVersionFields } from "../services/get-pages-fields.js";
import findRebuildConflict from "./find-rebuild-conflict.js";
import type { ResolvedPagesCollectionLocalization } from "./resolve-pages-collection-localization.js";

const localization: ResolvedPagesCollectionLocalization = {
	enabled: false,
	defaultLocale: null,
	storageLocale: null,
	locales: [null],
};

const page = (id: number, path: string): PageVersionFields => ({
	document_id: id,
	document_version_id: id * 10,
	rows: [{ locale: null, _slug: null, _path: path, _parentPage: null }],
});

describe("findRebuildConflict", () => {
	test("finds a rebuilt path that a page keeping its path already uses", () => {
		const conflict = findRebuildConflict({
			versions: [page(1, "/about/team"), page(2, "/old/team")],
			changed: [
				{
					documentId: 2,
					versionId: 20,
					values: new Map([[null, "/about/team"]]),
				},
			],
			localization,
		});

		expect(conflict).toEqual({
			documentId: 2,
			versionId: 20,
			locale: null,
			path: "/about/team",
		});
	});

	test("ignores clashes between pages that keep their paths", () => {
		const conflict = findRebuildConflict({
			versions: [page(1, "/team"), page(2, "/team"), page(3, "/old/jobs")],
			changed: [
				{ documentId: 3, versionId: 30, values: new Map([[null, "/jobs"]]) },
			],
			localization,
		});

		expect(conflict).toBeUndefined();
	});
});
