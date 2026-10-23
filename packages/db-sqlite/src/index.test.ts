import path from "node:path";
import { expect, test } from "vitest";
import { SQLiteAdapter } from "./index.js";

test("lists the database file as SQLite opens it, from the working directory", async () => {
	expect(await new SQLiteAdapter().localFiles()).toEqual([
		path.resolve("db.sqlite"),
	]);
	expect(
		await new SQLiteAdapter((env) => ({
			database: String(env.DATABASE_FILE),
		})).localFiles({ DATABASE_FILE: "data/cms.sqlite3" }),
	).toEqual([path.resolve("data/cms.sqlite3")]);
});

test("lists no files for in-memory and temporary databases", async () => {
	expect(
		await new SQLiteAdapter({ database: ":memory:" }).localFiles(),
	).toEqual([]);
	expect(await new SQLiteAdapter({ database: "" }).localFiles()).toEqual([]);
});
