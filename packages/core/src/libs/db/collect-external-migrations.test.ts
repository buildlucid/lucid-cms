import { expect, test } from "vitest";
import collectExternalMigrations from "./collect-external-migrations.js";

const migration = { up: async () => {} };

test("names file migrations by their stem and requires a timestamped name", () => {
	const migrations = collectExternalMigrations({
		modules: [
			{
				path: "/project/migrations/1751400000000-example.ts",
				module: { default: migration },
			},
		],
		definitions: [],
	});
	expect(Object.keys(migrations)).toEqual(["1751400000000-example"]);

	expect(() =>
		collectExternalMigrations({
			modules: [],
			definitions: [{ name: "example", migration }],
		}),
	).toThrow('Invalid migration name "example"');
});
