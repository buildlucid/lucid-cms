import { copy } from "@lucidcms/core";
import { resolveMediaStorageAdapter } from "@lucidcms/core/runtime";
import { filesystemStorageAdapter } from "@lucidcms/filesystem";
import {
	action,
	describe,
	expect,
	fc,
	requires,
	type Session,
	type SimulationContext,
	simulation,
	withFaults,
} from "#harness/simulation";
import { IMAGE_PRESET, MEDIA_LIMITS } from "#shared/fragments/media";
import {
	completeUpload,
	createMedia,
	fetchCdn,
	files,
	findStorageDrift,
	getMedia,
	type MediaFile,
	readStorageCounter,
	sendUpload,
	startUpload,
	sumStoredSizes,
} from "#shared/media";

/** What one media item should be: the file it serves, who may see it and whether it is binned. */
type Item = {
	/** Where the CDN serves it, which never changes. */
	url: string;
	file: MediaFile;
	public: boolean;
	binned: boolean;
};

type Model = {
	media: Map<number, Item>;
	/** Whether storage may fail, so a deleted file can be left behind on purpose. */
	faulty: boolean;
};

type Context = SimulationContext<Model>;

const KINDS = ["image", "text", "large"] as const;
type Kind = (typeof KINDS)[number];

/** A file of a kind. Shades and words make replacements differ from what they replace. */
const fileOf = (kind: Kind, variety: number): MediaFile => {
	switch (kind) {
		case "image":
			return files.png({ width: 4 + (variety % 5), shade: variety % 256 });
		case "text":
			return files.text(`Version ${variety}\n`);
		case "large":
			//* big enough that a few fill storage under the `media-limits` variant
			return files.sized(MEDIA_LIMITS.uploadBytes - 1024 - (variety % 100));
	}
};

const isImage = (item: Item) => item.file.mimeType.startsWith("image/");

/**
 * Uploads a file and makes it into media, returning the status of the step that stopped it, so a
 * refusal or a storage fault is an outcome rather than an error.
 */
const tryUpload = async (
	session: Session,
	file: MediaFile,
	visibility: { public: boolean },
): Promise<{ status: number; id?: number }> => {
	const started = await startUpload(session, file, visibility);
	if (started.status !== 200) return { status: started.status };

	const sent = await sendUpload(session, started.body.data, file);
	if (!sent.ok) return { status: sent.status };

	const completed = await completeUpload(session, started.body.data.sessionId);
	if (completed.status !== 200) return { status: completed.status };

	const created = await createMedia(session, started.body.data.key, {
		title: file.name,
		fileName: file.name,
	});
	return { status: created.status, id: created.body?.data?.id };
};

/** Picks one of the items that pass `filter`, whichever IDs they have. */
const pick = (
	model: Model,
	index: number,
	filter: (item: Item) => boolean,
): [number, Item] => {
	const items = [...model.media].filter(([, item]) => filter(item));
	const picked = items[index % items.length];
	if (!picked) {
		throw new Error(
			"No media matches. The action's `when` should rule this out.",
		);
	}
	return picked;
};

const kept = (item: Item) => !item.binned;
const binned = (item: Item) => item.binned;
const some = (filter: (item: Item) => boolean) => (model: Model) =>
	[...model.media.values()].some(filter);

const upload = action<Model, { kind: Kind; variety: number; public: boolean }>({
	name: "upload",
	input: fc.record({
		kind: fc.constantFrom(...KINDS),
		variety: fc.nat({ max: 1000 }),
		public: fc.boolean(),
	}),
	run: async ({ admin, model, input }) => {
		const file = fileOf(input.kind, input.variety);
		const uploaded = await tryUpload(admin, file, { public: input.public });

		if (uploaded.status === 201 && uploaded.id !== undefined) {
			const media = await getMedia(admin, uploaded.id);
			model.media.set(uploaded.id, {
				url: media.url,
				file,
				public: input.public,
				binned: false,
			});
		}
		return uploaded.status;
	},
});

const replace = action<Model, { item: number; variety: number }>({
	name: "replace",
	input: fc.record({ item: fc.nat(), variety: fc.nat({ max: 1000 }) }),
	when: some(kept),
	run: async ({ admin, model, input }) => {
		const [id, item] = pick(model, input.item, kept);
		const file = isImage(item)
			? fileOf("image", input.variety)
			: fileOf("text", input.variety);
		//* an upload started before a visibility change has the other one, which the replacement moves
		const started = await startUpload(admin, file, {
			public: input.variety % 2 === 0 ? item.public : !item.public,
		});
		if (started.status !== 200) return started.status;
		const sent = await sendUpload(admin, started.body.data, file);
		if (!sent.ok) return sent.status;
		const completed = await completeUpload(admin, started.body.data.sessionId);
		if (completed.status !== 200) return completed.status;

		const replaced = await admin.request({
			method: "PATCH",
			path: `/api/v1/media/${id}`,
			body: { key: started.body.data.key, fileName: file.name },
		});
		if (replaced.status === 204) {
			item.file = file;
			expect((await getMedia(admin, id)).url).toBe(item.url);
		}
		return replaced.status;
	},
});

const toggleVisibility = action<Model, number>({
	name: "toggleVisibility",
	input: fc.nat(),
	when: some(kept),
	run: async ({ admin, model, input }) => {
		const [id, item] = pick(model, input, kept);
		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/media/${id}`,
			body: { public: !item.public },
		});
		if (updated.status === 204) {
			item.public = !item.public;
			expect((await getMedia(admin, id)).url).toBe(item.url);
		}
		return updated.status;
	},
});

const requestVariant = action<Model, number>({
	name: "requestVariant",
	input: fc.nat(),
	when: some((item) => kept(item) && isImage(item)),
	run: async ({ admin, model, input }) => {
		const [, item] = pick(
			model,
			input,
			(entry) => kept(entry) && isImage(entry),
		);
		const served = await fetchCdn(admin, item.url, {
			query: { preset: IMAGE_PRESET.name },
		});
		expect(served.status).toBe(200);
		return served.status;
	},
});

const clearVariants = action<Model, number>({
	name: "clearVariants",
	input: fc.nat(),
	when: some(isImage),
	run: async ({ admin, model, input }) => {
		const [id] = pick(model, input, isImage);
		const cleared = await admin.request({
			method: "DELETE",
			path: `/api/v1/media/${id}/processed`,
		});
		return cleared.status;
	},
});

const bin = action<Model, number>({
	name: "bin",
	input: fc.nat(),
	when: some(kept),
	run: async ({ admin, model, input }) => {
		const [id, item] = pick(model, input, kept);
		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/media/${id}`,
		});
		expect(deleted.status).toBe(204);
		item.binned = true;
		return deleted.status;
	},
});

const restore = action<Model, number>({
	name: "restore",
	input: fc.nat(),
	when: some(binned),
	run: async ({ admin, model, input }) => {
		const [id, item] = pick(model, input, binned);
		const restored = await admin.request({
			method: "POST",
			path: "/api/v1/media/restore",
			body: { ids: [id] },
		});
		expect(restored.status).toBe(204);
		item.binned = false;
		return restored.status;
	},
});

const deletePermanently = action<Model, number>({
	name: "deletePermanently",
	input: fc.nat(),
	when: (model) => model.media.size > 0,
	run: async ({ admin, model, input }) => {
		const [id] = pick(model, input, () => true);
		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/media/${id}/permanent`,
		});
		if (deleted.status === 204) {
			model.media.delete(id);
		}
		return deleted.status;
	},
});

/** Uploads a file and never makes it into media, as when someone closes the upload drawer. */
const abandonUpload = action<Model, number>({
	name: "abandonUpload",
	input: fc.nat({ max: 1000 }),
	run: async ({ admin, input }) => {
		const file = fileOf("text", input);
		const started = await startUpload(admin, file);
		if (started.status !== 200) return started.status;
		const sent = await sendUpload(admin, started.body.data, file);
		if (!sent.ok) return sent.status;
		return (await completeUpload(admin, started.body.data.sessionId)).status;
	},
});

const actions = [
	upload,
	replace,
	toggleVisibility,
	requestVariant,
	clearVariants,
	bin,
	restore,
	deletePermanently,
	abandonUpload,
];

const sorted = (ids: number[]) => ids.toSorted((a, b) => a - b);

const bytesOf = async (response: Response) =>
	Buffer.from(await response.arrayBuffer());

const invariants = {
	"the storage counter matches what is stored": async ({ lucid }: Context) => {
		expect(await readStorageCounter(lucid)).toBe(await sumStoredSizes(lucid));
	},

	"storage stays within its limit": async ({ lucid }: Context) => {
		expect(await readStorageCounter(lucid)).toBeLessThanOrEqual(
			MEDIA_LIMITS.storageBytes,
		);
	},

	"every stored file belongs to media, and all media has its file": async ({
		lucid,
		model,
	}: Context) => {
		const drift = await findStorageDrift(lucid);
		expect(drift.missing).toEqual([]);
		//* a delete that fails after its change is saved leaves the file unused, which is allowed
		if (!model.faulty) {
			expect(drift.orphaned).toEqual([]);
		}
	},

	"each item is served to whoever may see it": async ({
		admin,
		lucid,
		model,
	}: Context) => {
		for (const [id, item] of model.media) {
			const visitor = await fetchCdn(lucid.session(), item.url);
			const signedIn = await fetchCdn(admin, item.url);
			const expected = item.binned ? 404 : item.public ? 200 : 401;

			expect(visitor.status, `media ${id} to a visitor`).toBe(expected);
			expect(signedIn.status, `media ${id} to the admin`).toBe(200);
			expect(
				(await bytesOf(signedIn)).equals(Buffer.from(item.file.bytes)),
				`media ${id} serves its latest file`,
			).toBe(true);
		}
	},

	"the library and the bin each list every item once": async ({
		admin,
		model,
	}: Context) => {
		const listed = async (deleted: 0 | 1) => {
			const response = await admin.request<{ data: Array<{ id: number }> }>({
				path: "/api/v1/media",
				query: { "filter[isDeleted]": deleted, perPage: 100 },
			});
			return sorted(response.body.data.map((media) => media.id));
		};
		const ids = (filter: (item: Item) => boolean) =>
			sorted(
				[...model.media].filter(([, item]) => filter(item)).map(([id]) => id),
			);

		expect(await listed(0)).toEqual(ids(kept));
		expect(await listed(1)).toEqual(ids(binned));
	},
};

describe("media lifecycle", () => {
	requires("plugin:filesystem", "plugin:sharp");

	simulation("media, its files and its storage always agree", {
		model: (): Model => ({ media: new Map(), faulty: false }),
		actions,
		invariants,
		variant: "media-limits",
	});

	simulation("no media loses its file when storage fails", {
		model: (): Model => ({ media: new Map(), faulty: true }),
		actions,
		invariants,
		variant: "media-limits",
		adapters: async (random, cms) => ({
			mediaStorage: withFaults(
				resolveMediaStorageAdapter(
					await filesystemStorageAdapter({ uploadDir: cms.uploads }),
				),
				{
					//* reads are left alone, as the checks after each action read files too
					methods: ["upload", "rename", "delete", "deleteMultiple"],
					fail: () =>
						random() < 0.2
							? {
									error: { message: copy.literal("Storage is unavailable") },
									data: undefined,
								}
							: null,
				},
			),
		}),
	});
});
