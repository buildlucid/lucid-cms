import { copy } from "@lucidcms/core";
import { inlineQueueAdapter } from "@lucidcms/core/runtime";
import {
	action,
	describe,
	expect,
	fc,
	requires,
	simulation,
	type SimulationContext,
	sorted,
	withFaults,
} from "#harness/simulation";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	type ContentReader,
	createContentReader,
	createDocument,
	type DocumentInput,
	listDocumentIds,
	readContent,
	readDocument,
	valuesOf,
} from "#shared/helpers/documents";

const DOCUMENTS = `/api/v1/documents/${STORY_KEY}`;
const ENVIRONMENTS = ["staging", "production"] as const;

type Environment = (typeof ENVIRONMENTS)[number];

/** What one story should hold. Content is the word it was written from. */
type Story = {
	latest: string;
	published: Partial<Record<Environment, string>>;
	/** The content each save or restore replaced, which the CMS keeps as revisions. */
	revisions: string[];
	binned: boolean;
};

type Model = {
	stories: Map<number, Story>;
	/** Reads the content API. Made on first use, as each sequence has a new CMS. */
	reader: ContentReader | null;
};

type Context = SimulationContext<Model>;

/** A story written from one word: a title, as many items as the word has letters, and a brick. */
const written = (word: string) =>
	({
		fields: [
			{ key: "title", type: "text", value: word },
			{
				key: "items",
				type: "repeater",
				groups: [...word].map((letter, order) => ({
					ref: `item-${order}`,
					order,
					fields: [{ key: "item_title", type: "text", value: letter }],
				})),
			},
		],
		bricks: [
			{
				ref: "hero",
				key: "story-hero",
				order: 0,
				type: "builder",
				fields: [{ key: "heading", type: "text", value: word }],
			},
		],
	}) satisfies DocumentInput;

const word = fc.stringMatching(/^[a-z]{1,4}$/);

/** Picks one of the stories that pass `filter`, whichever IDs they have. */
const pick = (
	model: Model,
	index: number,
	filter: (story: Story) => boolean,
): [number, Story] => {
	const stories = [...model.stories].filter(([, story]) => filter(story));
	const picked = stories[index % stories.length];
	if (!picked) {
		throw new Error(
			"No story matches. The action's `when` should rule this out.",
		);
	}
	return picked;
};

const kept = (story: Story) => !story.binned;
const binned = (story: Story) => story.binned;
const some = (filter: (story: Story) => boolean) => (model: Model) =>
	[...model.stories.values()].some(filter);

const createStory = action<Model, string>({
	name: "createStory",
	input: word,
	run: async ({ admin, model, input }) => {
		const id = await createDocument(admin, STORY_KEY, written(input));
		model.stories.set(id, {
			latest: input,
			published: {},
			revisions: [],
			binned: false,
		});
	},
});

const saveStory = action<Model, { story: number; word: string }>({
	name: "saveStory",
	input: fc.record({ story: fc.nat(), word }),
	when: some(kept),
	run: async ({ admin, model, input }) => {
		const [id, story] = pick(model, input.story, kept);
		const saved = await admin.request({
			method: "POST",
			path: `${DOCUMENTS}/${id}`,
			body: written(input.word),
		});
		expect(saved.status).toBe(200);

		story.revisions.push(story.latest);
		story.latest = input.word;
	},
});

const publishStory = action<Model, { story: number; environment: Environment }>(
	{
		name: "publishStory",
		input: fc.record({
			story: fc.nat(),
			environment: fc.constantFrom(...ENVIRONMENTS),
		}),
		when: some(kept),
		run: async ({ admin, model, input }) => {
			const [id, story] = pick(model, input.story, kept);
			const published = await admin.request({
				method: "POST",
				path: `${DOCUMENTS}/${id}/publish`,
				body: { environment: input.environment },
			});

			//* production only takes content that staging already holds
			const allowed =
				input.environment === "staging" ||
				story.published.staging === story.latest;
			expect(published.status).toBe(allowed ? 204 : 409);
			if (allowed) {
				story.published[input.environment] = story.latest;
			}
		},
	},
);

const unpublishStory = action<
	Model,
	{ story: number; environment: Environment }
>({
	name: "unpublishStory",
	input: fc.record({
		story: fc.nat(),
		environment: fc.constantFrom(...ENVIRONMENTS),
	}),
	when: some((story) => kept(story) && Object.keys(story.published).length > 0),
	run: async ({ admin, model, input }) => {
		const [id, story] = pick(
			model,
			input.story,
			(story) => kept(story) && Object.keys(story.published).length > 0,
		);
		const unpublished = await admin.request({
			method: "POST",
			path: `${DOCUMENTS}/${id}/unpublish`,
			body: { environment: input.environment },
		});

		if (unpublished.status === 204) {
			delete story.published[input.environment];
		}
	},
});

const restoreRevision = action<Model, { story: number; revision: number }>({
	name: "restoreRevision",
	input: fc.record({ story: fc.nat(), revision: fc.nat() }),
	when: some((story) => kept(story) && story.revisions.length > 0),
	run: async ({ admin, model, input }) => {
		const [id, story] = pick(
			model,
			input.story,
			(story) => kept(story) && story.revisions.length > 0,
		);
		const revisions = await admin.request<{ data: Array<{ id: number }> }>({
			path: `${DOCUMENTS}/${id}/revisions`,
			query: { perPage: 100 },
		});
		//* IDs rise with each revision, so sorting them gives the order the model kept them in
		const revisionIds = revisions.body.data
			.map((revision) => revision.id)
			.toSorted((a, b) => a - b);
		const index = input.revision % story.revisions.length;

		const restored = await admin.request({
			method: "POST",
			path: `${DOCUMENTS}/${id}/${revisionIds[index]}/restore-revision`,
		});
		expect(restored.status).toBe(204);

		const content = story.revisions[index] as string;
		story.revisions.push(story.latest);
		story.latest = content;
	},
});

const binStory = action<Model, number>({
	name: "binStory",
	input: fc.nat(),
	when: some(kept),
	run: async ({ admin, model, input }) => {
		const [id, story] = pick(model, input, kept);
		const deleted = await admin.request({
			method: "DELETE",
			path: `${DOCUMENTS}/${id}`,
		});
		expect(deleted.status).toBe(204);
		story.binned = true;
	},
});

const restoreStory = action<Model, number>({
	name: "restoreStory",
	input: fc.nat(),
	when: some(binned),
	run: async ({ admin, model, input }) => {
		const [id, story] = pick(model, input, binned);
		const restored = await admin.request({
			method: "POST",
			path: `${DOCUMENTS}/restore`,
			body: { ids: [id] },
		});
		expect(restored.status).toBe(204);
		story.binned = false;
	},
});

const deleteStoryForGood = action<Model, number>({
	name: "deleteStoryForGood",
	input: fc.nat(),
	when: some(binned),
	run: async ({ admin, model, input }) => {
		const [id] = pick(model, input, binned);
		const deleted = await admin.request({
			method: "DELETE",
			path: `${DOCUMENTS}/${id}/permanent`,
		});
		expect(deleted.status).toBe(204);
		model.stories.delete(id);
	},
});

const actions = [
	createStory,
	saveStory,
	publishStory,
	unpublishStory,
	restoreRevision,
	binStory,
	restoreStory,
	deleteStoryForGood,
];

const readerOf = async ({ admin, lucid, model }: Context) => {
	model.reader ??= await createContentReader(admin, lucid.session);
	return model.reader;
};

const invariants = {
	"latest holds the whole of the last save": async ({
		admin,
		model,
	}: Context) => {
		for (const [id, story] of model.stories) {
			const latest = await readDocument(admin, STORY_KEY, id);
			expect(latest.isDeleted, `story ${id} in the bin`).toBe(story.binned);
			expect(latest, `story ${id}`).toMatchObject(
				valuesOf(written(story.latest)),
			);
			expect(latest.fields.items, `story ${id}'s items`).toHaveLength(
				story.latest.length,
			);
		}
	},

	"each environment holds what was last published to it": async (
		context: Context,
	) => {
		const read = await readerOf(context);

		for (const [id, story] of context.model.stories) {
			for (const environment of ENVIRONMENTS) {
				const content = await readContent(read, STORY_KEY, id, environment);
				const expected = story.binned
					? undefined
					: story.published[environment];

				expect(content?.fields.title, `story ${id} in ${environment}`).toBe(
					expected,
				);
				if (content && expected) {
					expect(content, `story ${id} in ${environment}`).toMatchObject({
						bricks: valuesOf(written(expected)).bricks,
					});
				}
			}
		}
	},

	"a revision is kept for everything a save replaced": async ({
		admin,
		model,
	}: Context) => {
		for (const [id, story] of model.stories) {
			const revisions = await admin.request<{
				pagination: { total: number };
			}>({ path: `${DOCUMENTS}/${id}/revisions` });

			expect(revisions.body.pagination.total, `story ${id}`).toBe(
				story.revisions.length,
			);
		}
	},

	"the lists hold every story once": async (context: Context) => {
		const { admin, model } = context;
		const read = await readerOf(context);
		const ids = (filter: (story: Story) => boolean) =>
			sorted(
				[...model.stories]
					.filter(([, story]) => filter(story))
					.map(([id]) => id),
			);

		expect(
			sorted(
				await listDocumentIds(admin, STORY_KEY, { "filter[isDeleted]": 0 }),
			),
		).toEqual(ids(kept));
		expect(
			sorted(
				await listDocumentIds(admin, STORY_KEY, { "filter[isDeleted]": 1 }),
			),
		).toEqual(ids(binned));

		const staging = await read<{ data: Array<{ id: number }> }>(
			`documents/${STORY_KEY}`,
			{ version: "staging", perPage: 100 },
		);
		expect(sorted(staging.body.data.map((story) => story.id))).toEqual(
			ids((story) => kept(story) && story.published.staging !== undefined),
		);
	},
};

describe("document lifecycle", () => {
	requires(`collection:${STORY_KEY}`);

	simulation("stories always hold what was last saved and published", {
		model: (): Model => ({ stories: new Map(), reader: null }),
		actions,
		invariants,
	});

	simulation("stories survive a queue that drops deliveries", {
		model: (): Model => ({ stories: new Map(), reader: null }),
		actions,
		invariants,
		adapters: (random) => ({
			queue: withFaults(inlineQueueAdapter(), {
				methods: ["publish"],
				fail: () =>
					random() < 0.3
						? {
								error: {
									message: copy("server:core.queue.inline.consume.failed"),
								},
								data: undefined,
							}
						: null,
			}),
		}),
	});
});
