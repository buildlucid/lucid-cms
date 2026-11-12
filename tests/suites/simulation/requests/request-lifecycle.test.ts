import type { RequestBlocker } from "@lucidcms/core/types";
import {
	action,
	describe,
	expect,
	fc,
	requires,
	type Session,
	simulation,
	type SimulationContext,
	sorted,
} from "#harness/simulation";
import { TEAM_STORY_KEY } from "#shared/config/collections/team-story";
import {
	listDocumentIds,
	readDocument,
	saveDocument,
	titled,
} from "#shared/helpers/documents";
import {
	approve,
	approverIds,
	authorPermissions,
	blockerCodes,
	commentsOf,
	createWithTeam,
	editProposal,
	onlyDocument,
	openCreateRequest,
	postComment,
	readRequest,
	requestAction,
	requestChange,
	reviewerPermissions,
	setTargets,
	waitForRequestRun,
} from "#shared/helpers/requests";

const DOCUMENTS = `/api/v1/documents/${TEAM_STORY_KEY}`;
const ENVIRONMENTS = ["staging", "production"] as const;

type Environment = (typeof ENVIRONMENTS)[number];

/** Who acts: the author, who can only ask, or one of the two reviewers. */
const PEOPLE = ["author", "reviewer", "secondReviewer"] as const;
type Person = (typeof PEOPLE)[number];

/** What one team story should hold. Content is the word it was written from. */
type Story = {
	/** False while it only exists as its create request's proposal. */
	created: boolean;
	latest: string;
	published: Partial<Record<Environment, string>>;
	/** Stands for each environment's version, which every publish replaces. Null when unpublished. */
	versions: Record<Environment, number | null>;
	binned: boolean;
};

type Request = {
	id: number;
	type: "create" | "publish" | "unpublish" | "delete";
	documentId: number;
	requestDocumentId: number;
	by: Person;
	status: "open" | "completed" | "closed";
	/** What a create or publish request would write. */
	proposal: string | null;
	targets: Environment[];
	approvals: Set<Person>;
	approved: boolean;
	openComments: number;
	/** Environments that changed since the request was made, which stay changed. */
	changed: Set<Environment>;
	/** The environment version each acknowledgement was for. */
	acknowledged: Map<Environment, number | null>;
};

type Model = {
	people: Partial<Record<Person, { id: number; session: Session }>>;
	stories: Map<number, Story>;
	requests: Request[];
	/** Hands out the version numbers in `Story.versions`. */
	nextVersion: number;
};

type Context = SimulationContext<Model>;

/** Two approvals from people other than whoever asked, as team stories need. */
const REQUIRED_APPROVALS = 2;

const word = fc.stringMatching(/^[a-z]{1,4}$/);
const reviewer = fc.constantFrom<Person>("reviewer", "secondReviewer");
//* the author asks for most changes, as a reviewer's own request has only one other reviewer to approve it
const opener = fc.oneof(
	{ arbitrary: fc.constant<Person>("author"), weight: 3 },
	{ arbitrary: reviewer, weight: 1 },
);
//* reviewers do most approving and completing, and the author tries now and then
const actor = fc.oneof(
	{ arbitrary: reviewer, weight: 4 },
	{ arbitrary: fc.constant<Person>("author"), weight: 1 },
);

const sessionOf = (model: Model, who: Person) => {
	const found = model.people[who];
	if (!found) {
		throw new Error(`${who} wasn't made. The simulation's setup should.`);
	}
	return found.session;
};

/** Picks one of the items that pass `filter`, however many there are. */
const pick = <Item>(
	items: Iterable<Item>,
	index: number,
	filter: (item: Item) => boolean,
): Item => {
	const matching = [...items].filter(filter);
	const picked = matching[index % matching.length];
	if (picked === undefined) {
		throw new Error(
			"Nothing matches. The action's `when` should rule this out.",
		);
	}
	return picked;
};

/** Requests from the newest, so small choices keep working on the same few. */
const newestFirst = (model: Model) => model.requests.toReversed();
/** Mostly the newest requests, so their approvals add up. */
const recent = fc.nat({ max: 3 });

const some =
	<Item>(
		items: (model: Model) => Iterable<Item>,
		filter: (item: Item) => boolean,
	) =>
	(model: Model) =>
		[...items(model)].some(filter);

const storiesOf = (model: Model) => model.stories.entries();
const storyOf = (model: Model, request: Request) => {
	const story = model.stories.get(request.documentId);
	if (!story) {
		throw new Error(`Request ${request.id}'s story isn't in the model.`);
	}
	return story;
};

const live = ([, story]: [number, Story]) => story.created && !story.binned;
const open = (request: Request) => request.status === "open";
const writable = (request: Request) =>
	open(request) && (request.type === "create" || request.type === "publish");

/** Whether someone may change a request, as the CMS's `edit` permission says. */
const canWrite = (request: Request, who: Person) =>
	who !== "author" ||
	request.type === "publish" ||
	request.type === "unpublish" ||
	request.by === "author";

/** Why the model expects a request can't be approved. Only open requests have blockers. */
const blockersOf = (
	model: Model,
	request: Request,
): RequestBlocker["code"][] => {
	if (!open(request)) {
		return [];
	}
	const story = storyOf(model, request);
	const codes: RequestBlocker["code"][] = [];
	if (story.binned) {
		codes.push("document_deleted");
	} else if (!request.approved) {
		for (const target of request.targets) {
			const acknowledged =
				request.acknowledged.has(target) &&
				request.acknowledged.get(target) === story.versions[target];
			if (request.changed.has(target) && !acknowledged) {
				codes.push("acknowledge_required");
			}
		}
	}
	if (request.openComments > 0) {
		codes.push("comments_open");
	}
	return codes.toSorted();
};

/** Withdraws an open request's approvals, as any change to what it would do does. */
const dismiss = (request: Request) => {
	if (open(request)) {
		request.approvals.clear();
		request.approved = false;
	}
};

/** Records an environment changing under every other request for the story. */
const changeEnvironment = (
	model: Model,
	documentId: number,
	environment: Environment,
	excluding?: Request,
) => {
	for (const request of model.requests) {
		if (
			request === excluding ||
			request.documentId !== documentId ||
			request.status === "completed"
		) {
			continue;
		}
		request.changed.add(environment);
		request.acknowledged.delete(environment);
		if (request.targets.includes(environment)) {
			dismiss(request);
		}
	}
};

const publishTo = (
	model: Model,
	documentId: number,
	environment: Environment,
	content: string,
	by?: Request,
) => {
	const story = model.stories.get(documentId);
	if (!story) {
		return;
	}
	story.published[environment] = content;
	story.versions[environment] = model.nextVersion++;
	changeEnvironment(model, documentId, environment, by);
};

const unpublishFrom = (
	model: Model,
	documentId: number,
	environment: Environment,
	by?: Request,
) => {
	const story = model.stories.get(documentId);
	if (!story || story.published[environment] === undefined) {
		return;
	}
	delete story.published[environment];
	story.versions[environment] = null;
	changeEnvironment(model, documentId, environment, by);
};

/** Adds an opened request to the model, reading the ID of its document in the request. */
const track = async (
	context: Context,
	request: Omit<
		Request,
		| "requestDocumentId"
		| "status"
		| "approvals"
		| "approved"
		| "openComments"
		| "changed"
		| "acknowledged"
	>,
) => {
	const read = await readRequest(
		sessionOf(context.model, request.by),
		request.id,
	);
	context.model.requests.push({
		...request,
		requestDocumentId: onlyDocument(read).id,
		status: "open",
		approvals: new Set(),
		approved: false,
		openComments: 0,
		changed: new Set(),
		acknowledged: new Map(),
	});
};

const requestInput = fc.record({ request: recent, by: actor });

const openCreate = action<Model, { by: Person; word: string }>({
	name: "openCreate",
	input: fc.record({ by: opener, word }),
	run: async (context) => {
		const { model, input } = context;
		const { id, requestId } = await openCreateRequest(
			sessionOf(model, input.by),
			TEAM_STORY_KEY,
			{ title: `Create ${input.word}`, ...titled(input.word) },
		);
		model.stories.set(id, {
			created: false,
			latest: input.word,
			published: {},
			versions: { staging: null, production: null },
			binned: false,
		});
		await track(context, {
			id: requestId,
			type: "create",
			documentId: id,
			by: input.by,
			proposal: input.word,
			targets: [],
		});
	},
});

const openPublish = action<
	Model,
	{ story: number; by: Person; production: boolean }
>({
	name: "openPublish",
	input: fc.record({ story: fc.nat(), by: opener, production: fc.boolean() }),
	when: some(storiesOf, live),
	run: async (context) => {
		const { model, input } = context;
		const [documentId, story] = pick(model.stories, input.story, live);
		//* production needs staging first, so it is always asked for with it
		const targets: Environment[] = input.production
			? ["staging", "production"]
			: ["staging"];
		const opened = await requestChange(sessionOf(model, input.by), "publish", [
			{ collectionKey: TEAM_STORY_KEY, documentId, targets },
		]);
		expect(opened.status).toBe(201);
		await track(context, {
			id: opened.body.data.id,
			type: "publish",
			documentId,
			by: input.by,
			proposal: story.latest,
			targets,
		});
	},
});

const openUnpublish = action<
	Model,
	{ story: number; by: Person; both: boolean }
>({
	name: "openUnpublish",
	input: fc.record({ story: fc.nat(), by: opener, both: fc.boolean() }),
	when: some(
		storiesOf,
		(entry) => live(entry) && Object.keys(entry[1].published).length > 0,
	),
	run: async (context) => {
		const { model, input } = context;
		const [documentId, story] = pick(
			model.stories,
			input.story,
			(entry) => live(entry) && Object.keys(entry[1].published).length > 0,
		);
		const held = ENVIRONMENTS.filter(
			(environment) => story.published[environment] !== undefined,
		);
		const targets = input.both ? held : held.slice(0, 1);
		const opened = await requestChange(
			sessionOf(model, input.by),
			"unpublish",
			[{ collectionKey: TEAM_STORY_KEY, documentId, targets }],
		);
		expect(opened.status).toBe(201);
		await track(context, {
			id: opened.body.data.id,
			type: "unpublish",
			documentId,
			by: input.by,
			proposal: null,
			targets,
		});
	},
});

const openDelete = action<Model, { story: number; by: Person }>({
	name: "openDelete",
	input: fc.record({ story: fc.nat(), by: opener }),
	when: some(storiesOf, live),
	run: async (context) => {
		const { model, input } = context;
		const [documentId] = pick(model.stories, input.story, live);
		const opened = await requestChange(sessionOf(model, input.by), "delete", [
			{ collectionKey: TEAM_STORY_KEY, documentId },
		]);
		expect(opened.status).toBe(201);
		await track(context, {
			id: opened.body.data.id,
			type: "delete",
			documentId,
			by: input.by,
			proposal: null,
			targets: [],
		});
	},
});

const editRequestProposal = action<Model, { request: number; word: string }>({
	name: "editProposal",
	input: fc.record({ request: recent, word }),
	when: some((model) => model.requests, writable),
	run: async ({ model, input }) => {
		const request = pick(newestFirst(model), input.request, writable);
		const session = sessionOf(model, request.by);
		const edited = await editProposal(
			session,
			onlyDocument(await readRequest(session, request.id)),
			titled(input.word),
		);
		expect(edited.status).toBe(200);
		request.proposal = input.word;
		dismiss(request);
	},
});

/** Approves a request as someone, checking the CMS answers as the model expects. */
const approveAs = async (model: Model, request: Request, by: Person) => {
	const expected =
		!open(request) || by === "author" || by === request.by
			? 403
			: request.approved ||
				  request.approvals.has(by) ||
				  blockersOf(model, request).length > 0
				? 409
				: 204;

	const approved = await approve(sessionOf(model, by), request.id);
	expect(approved.status).toBe(expected);
	if (expected === 204) {
		request.approvals.add(by);
		request.approved = request.approvals.size >= REQUIRED_APPROVALS;
	}
	return approved.status;
};

const approveRequest = action<Model, { request: number; by: Person }>({
	name: "approve",
	input: requestInput,
	when: (model) => model.requests.length > 0,
	run: async ({ model, input }) => {
		await approveAs(
			model,
			pick(newestFirst(model), input.request, () => true),
			input.by,
		);
	},
});

/** A reviewer who could approve the request now: not whoever asked, and not one who already did. */
const nextApprover = (model: Model, request: Request) =>
	open(request) && !request.approved && blockersOf(model, request).length === 0
		? (["reviewer", "secondReviewer"] as const).find(
				(who) => who !== request.by && !request.approvals.has(who),
			)
		: undefined;

/** Approves a request that is ready for it, so sequences reach approval more often than chance would. */
const approveReady = action<Model, number>({
	name: "approveReady",
	input: recent,
	when: (model) =>
		model.requests.some((request) => nextApprover(model, request)),
	run: async ({ model, input }) => {
		const request = pick(newestFirst(model), input, (request) =>
			Boolean(nextApprover(model, request)),
		);
		const by = nextApprover(model, request);
		if (!by) {
			throw new Error(`Nobody can approve request ${request.id}.`);
		}
		expect(await approveAs(model, request, by)).toBe(204);
	},
});

const withdrawApproval = action<Model, { request: number; by: Person }>({
	name: "withdraw",
	input: fc.record({ request: recent, by: reviewer }),
	when: some((model) => model.requests, open),
	run: async ({ model, input }) => {
		const request = pick(newestFirst(model), input.request, open);
		const expected =
			input.by === request.by
				? 403
				: request.approvals.has(input.by)
					? 204
					: 409;

		const withdrawn = await requestAction(
			sessionOf(model, input.by),
			request.id,
			"unapprove",
		);
		expect(withdrawn.status).toBe(expected);
		if (expected === 204) {
			request.approvals.delete(input.by);
			request.approved = false;
		}
	},
});

/** Completes a request as someone, checking the CMS answers and applies it as the model expects. */
const completeAs = async (model: Model, request: Request, by: Person) => {
	const expected =
		!open(request) || by === "author" ? 403 : request.approved ? 202 : 409;

	const session = sessionOf(model, by);
	const completed = await requestAction(session, request.id, "complete");
	expect(completed.status).toBe(expected);
	if (expected !== 202) {
		return completed.status;
	}
	expect((await waitForRequestRun(session, request.id)).status).toBe(
		"completed",
	);

	request.status = "completed";
	const story = storyOf(model, request);
	switch (request.type) {
		case "create":
			story.created = true;
			story.latest = request.proposal ?? story.latest;
			break;
		case "publish":
			for (const target of request.targets) {
				publishTo(
					model,
					request.documentId,
					target,
					request.proposal ?? story.latest,
					request,
				);
			}
			break;
		case "unpublish":
			for (const target of request.targets) {
				unpublishFrom(model, request.documentId, target, request);
			}
			break;
		case "delete":
			story.binned = true;
			for (const other of model.requests) {
				if (other.documentId === request.documentId) {
					dismiss(other);
				}
			}
			break;
	}
	return completed.status;
};

const completeRequest = action<Model, { request: number; by: Person }>({
	name: "complete",
	input: requestInput,
	when: (model) => model.requests.length > 0,
	run: async ({ model, input }) => {
		await completeAs(
			model,
			pick(newestFirst(model), input.request, () => true),
			input.by,
		);
	},
});

const approvedAndOpen = (request: Request) => open(request) && request.approved;

/** Completes an approved request as a reviewer, so sequences reach completion more often than chance would. */
const completeApproved = action<Model, number>({
	name: "completeApproved",
	input: recent,
	when: some((model) => model.requests, approvedAndOpen),
	run: async ({ model, input }) => {
		const request = pick(newestFirst(model), input, approvedAndOpen);
		expect(await completeAs(model, request, "reviewer")).toBe(202);
	},
});

const closeRequest = action<Model, { request: number; by: Person }>({
	name: "close",
	input: requestInput,
	when: some((model) => model.requests, open),
	run: async ({ model, input }) => {
		const request = pick(newestFirst(model), input.request, open);
		const expected = canWrite(request, input.by) ? 204 : 403;

		const closed = await requestAction(
			sessionOf(model, input.by),
			request.id,
			"close",
		);
		expect(closed.status).toBe(expected);
		if (expected === 204) {
			request.status = "closed";
		}
	},
});

const reopenRequest = action<Model, { request: number; by: Person }>({
	name: "reopen",
	input: requestInput,
	when: some(
		(model) => model.requests,
		(request) => request.status === "closed",
	),
	run: async ({ model, input }) => {
		const request = pick(
			model.requests,
			input.request,
			(request) => request.status === "closed",
		);
		const expected = canWrite(request, input.by) ? 204 : 403;

		const reopened = await requestAction(
			sessionOf(model, input.by),
			request.id,
			"reopen",
		);
		expect(reopened.status).toBe(expected);
		if (expected === 204) {
			request.status = "open";
			dismiss(request);
		}
	},
});

const comment = action<Model, { request: number; by: Person }>({
	name: "comment",
	input: requestInput,
	when: some((model) => model.requests, open),
	run: async ({ model, input }) => {
		const request = pick(newestFirst(model), input.request, open);

		const posted = await postComment(
			sessionOf(model, input.by),
			request.id,
			"A question",
		);
		expect(posted.status).toBe(204);
		request.openComments += 1;
		dismiss(request);
	},
});

const hasOpenComments = (request: Request) =>
	open(request) && request.openComments > 0;

const resolveComment = action<Model, number>({
	name: "resolveComment",
	input: recent,
	when: some((model) => model.requests, hasOpenComments),
	run: async ({ model, input }) => {
		const request = pick(newestFirst(model), input, hasOpenComments);
		const session = sessionOf(model, request.by);
		const unresolved = commentsOf(await readRequest(session, request.id)).find(
			(comment) => !comment.resolution,
		);
		if (!unresolved) {
			throw new Error(`Request ${request.id} has no comment to resolve.`);
		}

		const resolved = await session.request({
			method: "PATCH",
			path: `/api/v1/requests/${request.id}/comments/${unresolved.id}/resolution`,
			body: { resolution: "resolved" },
		});
		expect(resolved.status).toBe(204);
		request.openComments -= 1;
	},
});

const needsAcknowledging = (model: Model) => (request: Request) =>
	open(request) &&
	!storyOf(model, request).binned &&
	blockersOf(model, request).includes("acknowledge_required");

const acknowledge = action<Model, { request: number; by: Person }>({
	name: "acknowledge",
	input: requestInput,
	when: (model) => model.requests.some(needsAcknowledging(model)),
	run: async ({ model, input }) => {
		const request = pick(
			model.requests,
			input.request,
			needsAcknowledging(model),
		);
		const story = storyOf(model, request);
		const target = request.targets.find(
			(environment) =>
				request.changed.has(environment) &&
				request.acknowledged.get(environment) !== story.versions[environment],
		);
		if (!target) {
			throw new Error(`Request ${request.id} has nothing to acknowledge.`);
		}
		const expected = canWrite(request, input.by) ? 204 : 403;
		const session = sessionOf(model, input.by);

		const acknowledged = await session.request({
			method: "PATCH",
			path: `/api/v1/requests/${request.id}/documents/${request.requestDocumentId}/targets/acknowledgement`,
			body: {
				target,
				acknowledged: true,
				ifUnchanged: (await readRequest(session, request.id)).reviewToken,
			},
		});
		expect(acknowledged.status).toBe(expected);
		if (expected === 204) {
			request.acknowledged.set(target, story.versions[target]);
		}
	},
});

const retargetable = (request: Request) =>
	open(request) && request.type === "publish";

const retarget = action<Model, { request: number; production: boolean }>({
	name: "retarget",
	input: fc.record({ request: recent, production: fc.boolean() }),
	when: some((model) => model.requests, retargetable),
	run: async ({ model, input }) => {
		const request = pick(newestFirst(model), input.request, retargetable);
		const targets: Environment[] = input.production
			? ["staging", "production"]
			: ["staging"];

		const updated = await setTargets(
			sessionOf(model, request.by),
			request.id,
			request.requestDocumentId,
			targets,
		);
		expect(updated.status).toBe(204);
		if (targets.length === request.targets.length) {
			return;
		}
		for (const removed of request.targets.filter(
			(target) => !targets.includes(target),
		)) {
			request.acknowledged.delete(removed);
		}
		request.targets = targets;
		dismiss(request);
	},
});

const saveLatest = action<Model, { story: number; word: string }>({
	name: "saveLatest",
	input: fc.record({ story: fc.nat(), word }),
	when: some(storiesOf, live),
	run: async ({ model, input }) => {
		const [documentId, story] = pick(model.stories, input.story, live);
		await saveDocument(
			sessionOf(model, "reviewer"),
			TEAM_STORY_KEY,
			documentId,
			titled(input.word),
		);
		//* requests copied latest when they were made, so they keep their own proposals
		story.latest = input.word;
	},
});

const publishStaging = action<Model, number>({
	name: "publishStaging",
	input: fc.nat(),
	when: some(storiesOf, live),
	run: async ({ model, input }) => {
		const [documentId, story] = pick(model.stories, input, live);
		const published = await sessionOf(model, "reviewer").request({
			method: "POST",
			path: `${DOCUMENTS}/${documentId}/publish`,
			body: { environment: "staging" },
		});
		expect(published.status).toBe(204);
		publishTo(model, documentId, "staging", story.latest);
	},
});

const onStaging = (entry: [number, Story]) =>
	live(entry) && entry[1].published.staging !== undefined;

const unpublishStaging = action<Model, number>({
	name: "unpublishStaging",
	input: fc.nat(),
	when: some(storiesOf, onStaging),
	run: async ({ model, input }) => {
		const [documentId] = pick(model.stories, input, onStaging);
		const unpublished = await sessionOf(model, "reviewer").request({
			method: "POST",
			path: `${DOCUMENTS}/${documentId}/unpublish`,
			body: { environment: "staging" },
		});
		expect(unpublished.status).toBe(204);
		unpublishFrom(model, documentId, "staging");
	},
});

const repeat = <Item>(item: Item, times: number): Item[] =>
	Array.from({ length: times }, () => item);

const invariants = {
	"every story holds what was last saved, created or published to it": async ({
		model,
	}: Context) => {
		const session = sessionOf(model, "reviewer");
		await Promise.all(
			[...model.stories].map(async ([id, story]) => {
				if (!story.created) {
					const read = await session.request({
						path: `${DOCUMENTS}/${id}/latest`,
					});
					expect(read.status, `requested story ${id}`).toBe(404);
					return;
				}
				const latest = await readDocument(session, TEAM_STORY_KEY, id);
				expect(latest.isDeleted, `story ${id} in the bin`).toBe(story.binned);
				if (story.binned) {
					return;
				}
				expect(latest.fields.title, `story ${id}`).toBe(story.latest);
				for (const environment of ENVIRONMENTS) {
					const expected = story.published[environment];
					expect(
						latest.versions[environment] !== null,
						`story ${id} in ${environment}`,
					).toBe(expected !== undefined);
					if (expected !== undefined) {
						expect(
							(await readDocument(session, TEAM_STORY_KEY, id, environment))
								.fields.title,
							`story ${id} in ${environment}`,
						).toBe(expected);
					}
				}
			}),
		);
	},

	"only created stories are listed, until they are binned": async ({
		model,
	}: Context) => {
		expect(
			sorted(
				await listDocumentIds(sessionOf(model, "reviewer"), TEAM_STORY_KEY, {
					"filter[isDeleted]": 0,
				}),
			),
		).toEqual(sorted([...model.stories].filter(live).map(([id]) => id)));
	},

	"every request is as open, approved and blocked as its history says": async ({
		model,
	}: Context) => {
		const session = sessionOf(model, "reviewer");
		await Promise.all(
			model.requests.map(async (request) => {
				const read = await readRequest(session, request.id);
				expect(
					{
						status: read.status,
						approved: read.approved,
						approvers: sorted(approverIds(read)),
						blockers: blockerCodes(read),
						openComments: read.openComments,
						canApprove: read.permissions.approve,
					},
					`request ${request.id} (${request.type})`,
				).toEqual({
					status: request.status,
					approved: request.approved,
					approvers: sorted(
						[...request.approvals].flatMap(
							(who) => model.people[who]?.id ?? [],
						),
					),
					blockers: blockersOf(model, request),
					openComments: request.openComments,
					canApprove: open(request) && request.by !== "reviewer",
				});
			}),
		);
	},
};

describe("request lifecycle", () => {
	requires("harness:outbox", `collection:${TEAM_STORY_KEY}`);

	simulation(
		"requests only ever change content once two people approved exactly what they change",
		{
			model: (): Model => ({
				people: {},
				stories: new Map(),
				requests: [],
				nextVersion: 1,
			}),
			setup: async ({ lucid, model }) => {
				const people = {
					author: await lucid.user({
						permissions: authorPermissions(TEAM_STORY_KEY),
					}),
					reviewer: await lucid.user({
						permissions: reviewerPermissions(TEAM_STORY_KEY),
					}),
					secondReviewer: await lucid.user({
						permissions: reviewerPermissions(TEAM_STORY_KEY),
					}),
				};
				model.people = people;
				//* every sequence starts with a story, so it reaches publishing sooner
				const id = await createWithTeam(
					people,
					TEAM_STORY_KEY,
					titled("first"),
				);
				model.stories.set(id, {
					created: true,
					latest: "first",
					published: {},
					versions: { staging: null, production: null },
					binned: false,
				});
			},
			//* actions that move a request on are repeated, so approvals add up faster than changes withdraw them
			actions: [
				openCreate,
				...repeat(openPublish, 2),
				openUnpublish,
				openDelete,
				editRequestProposal,
				...repeat(approveRequest, 2),
				...repeat(approveReady, 4),
				withdrawApproval,
				completeRequest,
				...repeat(completeApproved, 3),
				closeRequest,
				reopenRequest,
				comment,
				...repeat(resolveComment, 2),
				...repeat(acknowledge, 3),
				retarget,
				saveLatest,
				publishStaging,
				unpublishStaging,
			],
			invariants,
			maxActions: 60,
		},
	);
});
