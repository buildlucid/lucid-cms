import {
	expect,
	migratedTo,
	type PrepareDatabase,
	type Session,
} from "#harness/vitest";
import { ARTICLE_KEY } from "#shared/config/migrations/collections/article";

const ARTICLES = `/api/v1/documents/${ARTICLE_KEY}`;

type FieldInput = {
	key: string;
	type: string;
	value?: unknown;
	groups?: Array<{ ref: string; order: number; fields: FieldInput[] }>;
};

type ArticleInput = {
	fields: FieldInput[];
	bricks?: Array<{
		ref: string;
		key: string;
		order: number;
		type: "builder";
		fields: FieldInput[];
	}>;
};

/** The article most scenarios store before they change the collection. */
export const FIRST_ARTICLE = {
	fields: [
		{ key: "title", type: "text", value: "First article" },
		{ key: "summary", type: "textarea", value: "Written before the change" },
		{ key: "rating", type: "number", value: 4 },
	],
} satisfies ArticleInput;

/** The ID `FIRST_ARTICLE` has in a database made by `withFirstArticle`. */
export const FIRST_ARTICLE_ID = 1;

/** Sends a new article, and leaves the response for the test to judge. */
export const postArticle = (admin: Session, article: ArticleInput) =>
	admin.request<{ data: { id: number } }>({
		method: "POST",
		path: ARTICLES,
		body: article,
	});

/** Creates an article that must be accepted, and returns its ID. */
export const createArticle = async (
	admin: Session,
	article: ArticleInput = FIRST_ARTICLE,
): Promise<number> => {
	const created = await postArticle(admin, article);
	expect(created.body, "creating an article").toMatchObject({
		data: { id: expect.any(Number) },
	});
	return created.body.data.id;
};

/** Reads an article's stored field values by key, with its bricks' values under `bricks`. */
export const readArticle = async (admin: Session, id: number) => {
	const read = await admin.request<{
		data: {
			fields: FieldInput[];
			bricks: Array<{ key: string; fields: FieldInput[] }>;
		};
	}>({
		path: `${ARTICLES}/${id}/latest`,
		query: { include: "bricks" },
	});
	expect(read.status, "reading an article").toBe(200);

	const values = (fields: FieldInput[]): Record<string, unknown> =>
		Object.fromEntries(
			fields.map((field) => [
				field.key,
				field.groups
					? field.groups.map((group) => values(group.fields))
					: field.value,
			]),
		);

	return {
		fields: values(read.body.data.fields),
		bricks: read.body.data.bricks.map((brick) => ({
			key: brick.key,
			fields: values(brick.fields),
		})),
	};
};

/** Reads what the admin is told about the collection's migration state. */
export const readMigrationStatus = async (admin: Session) => {
	const collection = await admin.request<{
		data: {
			migrationStatus: {
				requiresMigration: boolean;
				missingColumns: Record<string, string[]>;
			};
		};
	}>({ path: `/api/v1/collections/${ARTICLE_KEY}` });
	expect(collection.status, "reading the collection").toBe(200);

	return collection.body.data.migrationStatus;
};

/** Prepares a database at `article/base` with `FIRST_ARTICLE` stored, which most scenarios start from. */
export const withFirstArticle: PrepareDatabase = async (database) => {
	await migratedTo("article/base")(database);
	const id = await database.cms("article/base", (admin) =>
		createArticle(admin),
	);
	if (id !== FIRST_ARTICLE_ID) {
		throw new Error(`The first article was stored as ${id}.`);
	}
};
