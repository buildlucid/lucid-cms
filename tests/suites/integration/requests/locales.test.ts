import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	createDocument,
	expectStatus,
	saveDocument,
} from "#shared/helpers/documents";
import {
	approve,
	completeRequest,
	editProposal,
	onlyDocument,
	openRequest,
	readRequest,
	requestChange,
} from "#shared/helpers/requests";

const ARTICLE = "article";

/** An article's title in English and French. */
const titled = (translations: { en: string; fr: string }) => ({
	fields: [{ key: "title", type: "text", translations }],
});

/** Latest's title in each locale. */
const latestTitle = async (session: Session, id: number) => {
	const read = await session.request<{
		data: { fields: Array<{ key: string; translations?: object }> };
	}>({
		path: `/api/v1/documents/${ARTICLE}/${id}/latest`,
		query: { include: "bricks" },
	});
	expectStatus(`Reading article ${id}`, read, 200);
	return read.body.data.fields.find((field) => field.key === "title")
		?.translations;
};

describe("requests limited to some locales", () => {
	requires("feature:localization", `collection:${ARTICLE}`, "locale:fr");

	test("writes only French onto latest, keeping English edits made while it was open", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(
			admin,
			ARTICLE,
			titled({ en: "Hello", fr: "Bonjour" }),
		);
		const requestId = await openRequest(
			admin,
			"publish",
			[{ collectionKey: ARTICLE, documentId: id, targets: ["latest"] }],
			{ locales: ["fr"] },
		);
		const request = await readRequest(admin, requestId);
		expect(request.locales).toEqual(["fr"]);
		expect(
			(
				await editProposal(
					admin,
					onlyDocument(request),
					titled({ en: "Ignored", fr: "Salut" }),
				)
			).status,
		).toBe(200);
		expect((await approve(admin, requestId)).status).toBe(204);

		//* English isn't the request's, so changing it keeps the approval
		await saveDocument(
			admin,
			ARTICLE,
			id,
			titled({ en: "Hello there", fr: "Bonjour" }),
		);
		expect((await readRequest(admin, requestId)).approved).toBe(true);
		await completeRequest(admin, requestId);

		expect(await latestTitle(admin, id)).toEqual({
			en: "Hello there",
			fr: "Salut",
		});
	});

	test("refuses locales for anything but a publish request from latest into latest, in a localized collection", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const article = await createDocument(
			admin,
			ARTICLE,
			titled({ en: "Limited", fr: "Limité" }),
		);
		const story = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Not localized" }],
		});
		const refusals = await Promise.all([
			requestChange(
				admin,
				"publish",
				[{ collectionKey: ARTICLE, documentId: article, targets: ["latest"] }],
				{ locales: ["de"] },
			),
			requestChange(
				admin,
				"publish",
				[{ collectionKey: STORY_KEY, documentId: story, targets: ["latest"] }],
				{ locales: ["fr"] },
			),
			requestChange(
				admin,
				"publish",
				[{ collectionKey: STORY_KEY, documentId: story, targets: ["staging"] }],
				{ locales: ["fr"] },
			),
			requestChange(
				admin,
				"delete",
				[{ collectionKey: ARTICLE, documentId: article }],
				{ locales: ["fr"] },
			),
		]);

		expect(refusals.map((refusal) => refusal.status)).toEqual([
			400, 400, 400, 400,
		]);
	});
});
