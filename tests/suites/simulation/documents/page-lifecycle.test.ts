import { copy } from "@lucidcms/core";
import { inlineQueueAdapter } from "@lucidcms/core/runtime";
import {
	action,
	describe,
	expect,
	fc,
	requires,
	type SimulationContext,
	simulation,
	withFaults,
} from "#harness/simulation";

/** The pages that should exist, by ID. */
type Model = { pages: Map<number, string> };

const createPage = action<Model, string>({
	name: "createPage",
	input: fc.stringMatching(/^[a-z]{1,12}$/),
	run: async ({ admin, model, input }) => {
		const created = await admin.request<{ data: { id: number } }>({
			method: "POST",
			path: "/api/v1/documents/page",
			body: {
				fields: [{ key: "title", type: "text", value: input }],
			},
		});
		expect(created.status).toBe(201);

		model.pages.set(created.body.data.id, input);
		return created.body.data.id;
	},
});

const deletePage = action<Model, number>({
	name: "deletePage",
	//* picks one of the existing pages, whichever IDs they have
	input: fc.nat(),
	when: (model) => model.pages.size > 0,
	run: async ({ admin, model, input }) => {
		const id = [...model.pages.keys()][input % model.pages.size];
		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/documents/page/${id}`,
		});

		model.pages.delete(id as number);
		return deleted.status;
	},
});

const listsEveryPage = async ({ admin, model }: SimulationContext<Model>) => {
	const listed = await admin.request<{ pagination: { total: number } }>({
		path: "/api/v1/documents/page/latest",
		//* deleted pages stay in the database until they are removed for good
		query: { "filter[isDeleted]": 0 },
	});

	expect(listed.status).toBe(200);
	expect(listed.body.pagination.total).toBe(model.pages.size);
};

describe("page lifecycle", () => {
	requires("collection:page");

	simulation("the page list always matches what was created and deleted", {
		model: (): Model => ({ pages: new Map() }),
		actions: [createPage, deletePage],
		invariants: {
			"the list holds every page that was not deleted": listsEveryPage,
		},
	});

	simulation("pages survive a queue that drops deliveries", {
		model: (): Model => ({ pages: new Map() }),
		actions: [createPage, deletePage],
		invariants: {
			"the list holds every page that was not deleted": listsEveryPage,
		},
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
