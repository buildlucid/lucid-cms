import {
	action,
	describe,
	expect,
	fc,
	requires,
	type Session,
	type SimulationContext,
	simulation,
} from "#harness/simulation";
import {
	createChat,
	getMessages,
	sendMessage,
	toolCallsOf,
} from "#shared/agent";
import { callTool, reply, script } from "#shared/agent-script";
import { connectLucid, transcriptViolations } from "#shared/ai";
import { HARNESS_AGENT } from "#shared/fragments/ai";
import { setRolePermissions } from "#shared/permissions";

const COLLECTIONS = ["story", "page"] as const;
type Collection = (typeof COLLECTIONS)[number];
const ACTIONS = ["read", "create"] as const;

/** Everything a person here may be given, besides chatting with the harness agent. */
const GRANTS = COLLECTIONS.flatMap((collection) =>
	ACTIONS.map((action) => `documents:${collection}:${action}`),
);
const CHAT = `agents:${HARNESS_AGENT}:chat`;
const PEOPLE = 2;

type Person = {
	session: Session;
	roleId: number;
	/** A chat that never confirms, so a write runs or fails on permissions alone. */
	chatId: string;
	grants: string[];
};

type Model = { connection: string; people: Person[] };

type Context = SimulationContext<Model>;

const person = (model: Model, index: number) =>
	model.people[index % model.people.length] as Person;

/** Whether a tool call the agent made for a person went through. */
const lastToolStatus = async (person: Person) =>
	toolCallsOf(await getMessages(person.session, person.chatId)).at(-1)
		?.status ?? null;

const grant = action<Model, { person: number; grants: boolean[] }>({
	name: "grant",
	input: fc.record({
		person: fc.nat({ max: PEOPLE - 1 }),
		grants: fc.array(fc.boolean(), {
			minLength: GRANTS.length,
			maxLength: GRANTS.length,
		}),
	}),
	run: async ({ admin, model, input }) => {
		const chosen = person(model, input.person);
		chosen.grants = GRANTS.filter((_, index) => input.grants[index]);
		await setRolePermissions(admin, chosen.roleId, [CHAT, ...chosen.grants]);
		return { grants: chosen.grants };
	},
});

/** Asks the agent to search a collection, and does the same over the API as the person. */
const read = action<Model, { person: number; collection: Collection }>({
	name: "read",
	input: fc.record({
		person: fc.nat({ max: PEOPLE - 1 }),
		collection: fc.constantFrom(...COLLECTIONS),
	}),
	run: async ({ model, input }) => {
		const chosen = person(model, input.person);
		await sendMessage(
			chosen.session,
			chosen.chatId,
			script(
				callTool("documents_find", { collectionKey: input.collection }),
				reply("Searched."),
			),
		);
		const tool = await lastToolStatus(chosen);
		const api = await chosen.session.request({
			path: `/api/v1/documents/${input.collection}/latest`,
		});
		expect(tool === "complete").toBe(api.status === 200);
		return { tool, api: api.status };
	},
});

/**
 * Asks the agent to create a document, and checks the API would let the person do the same. Agent
 * writes also need read access to the collection, as every document write tool asks for it.
 */
const create = action<Model, { person: number; collection: Collection }>({
	name: "create",
	input: fc.record({
		person: fc.nat({ max: PEOPLE - 1 }),
		collection: fc.constantFrom(...COLLECTIONS),
	}),
	run: async ({ model, input }) => {
		const chosen = person(model, input.person);
		await sendMessage(
			chosen.session,
			chosen.chatId,
			script(
				callTool("documents_create", {
					collectionKey: input.collection,
					fields: { title: "Made by the agent" },
				}),
				reply("Created."),
			),
		);
		const tool = await lastToolStatus(chosen);
		//* an empty body is refused for permission first, or for its missing title once allowed
		const api = await chosen.session.request({
			method: "POST",
			path: `/api/v1/documents/${input.collection}`,
			body: { fields: [] },
		});
		const canRead = chosen.grants.includes(
			`documents:${input.collection}:read`,
		);
		expect(tool === "complete").toBe(api.status !== 403 && canRead);
		return { tool, api: api.status === 403 ? 403 : "allowed" };
	},
});

describe("agent authority", () => {
	requires("agent:harness", "harness:outbox", "mode:host");

	simulation("the agent can do exactly what the person it acts for can", {
		model: (): Model => ({ connection: "", people: [] }),
		setup: async ({ lucid, model }) => {
			model.connection = await connectLucid(lucid);
			for (let index = 0; index < PEOPLE; index++) {
				const user = await lucid.user({ permissions: [CHAT] });
				if (user.roleId === null) {
					throw new Error("The user was made without a role.");
				}
				const chat = await createChat(user.session, {
					confirmationMode: "automatic",
				});
				model.people.push({
					session: user.session,
					roleId: user.roleId,
					chatId: chat.id,
					grants: [],
				});
			}
		},
		actions: [grant, read, read, create],
		invariants: {
			"every transcript sent to Lucid is well formed": async ({
				lucid,
				model,
			}: Context) => {
				expect(await transcriptViolations(lucid, model.connection)).toEqual([]);
			},
		},
	});
});
