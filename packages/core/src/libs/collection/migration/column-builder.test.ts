import type { AlterTableColumnAlteringBuilder } from "kysely";
import { describe, expect, test, vi } from "vitest";
import type DatabaseAdapter from "../../db/adapter-base.js";
import { modifyColumn } from "./column-builder.js";

describe("modifyColumn", () => {
	test("executes supported nullability and default alterations", () => {
		const columnBuilder = {
			dropNotNull: vi.fn(),
			setNotNull: vi.fn(),
			dropDefault: vi.fn(),
			setDefault: vi.fn(),
		};
		columnBuilder.dropNotNull.mockReturnValue(columnBuilder);
		columnBuilder.setNotNull.mockReturnValue(columnBuilder);
		columnBuilder.dropDefault.mockReturnValue(columnBuilder);
		columnBuilder.setDefault.mockReturnValue(columnBuilder);

		const query = {
			alterColumn: vi.fn(
				(
					_name: string,
					callback: (column: typeof columnBuilder) => unknown,
				) => {
					callback(columnBuilder);
					return query;
				},
			),
		} as unknown as AlterTableColumnAlteringBuilder;
		const db = {
			supports: vi.fn(() => true),
			formatDefaultValue: vi.fn((_type, value) => value),
		} as unknown as DatabaseAdapter;

		modifyColumn(
			query,
			{
				type: "modify",
				column: {
					name: "title",
					source: "field",
					type: "text",
					nullable: true,
					default: "Untitled",
				},
				changes: {
					nullable: { from: false, to: true },
					default: { from: undefined, to: "Untitled" },
				},
			},
			db,
		);

		expect(query.alterColumn).toHaveBeenCalledTimes(2);
		expect(columnBuilder.dropNotNull).toHaveBeenCalledOnce();
		expect(columnBuilder.setDefault).toHaveBeenCalledWith("Untitled");
	});

	test("does not emit in-place alterations for unsupported adapters", () => {
		const query = {
			alterColumn: vi.fn(),
		} as unknown as AlterTableColumnAlteringBuilder;
		const db = {
			supports: vi.fn(() => false),
		} as unknown as DatabaseAdapter;

		modifyColumn(
			query,
			{
				type: "modify",
				column: { name: "title", source: "field", type: "text" },
				changes: { nullable: { from: false, to: true } },
			},
			db,
		);

		expect(query.alterColumn).not.toHaveBeenCalled();
	});
});
