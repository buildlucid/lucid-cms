import type { RunReport, TestRecord } from "./types.ts";

export type MatrixRow = {
	id: string;
	lane: string;
	file: string;
	/** The test's groups and name, joined for display. */
	title: string;
	/** The test's result in each column, where it ran. */
	cells: Record<string, TestRecord>;
};

export type Matrix = {
	/** One column per setup and mode, such as `node-sqlite (host)`. */
	columns: string[];
	rows: MatrixRow[];
};

/** Lines every test up across the setups and modes it ran in. */
const buildMatrix = (report: RunReport): Matrix => {
	const columns = new Set<string>();
	const rows = new Map<string, MatrixRow>();

	for (const lane of report.lanes) {
		const column = `${lane.setup} (${lane.mode})`;
		columns.add(column);

		for (const test of lane.tests) {
			const row = rows.get(test.id) ?? {
				id: test.id,
				lane: lane.lane,
				file: test.file,
				title: [...test.groups, test.name].join(" › "),
				cells: {},
			};
			row.cells[column] = test;
			rows.set(test.id, row);
		}
	}

	return {
		columns: [...columns].sort(),
		rows: [...rows.values()].sort((a, b) => a.id.localeCompare(b.id)),
	};
};

export default buildMatrix;
