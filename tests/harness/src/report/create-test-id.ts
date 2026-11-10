/** Builds the ID that lines a test up across setups, from its file and full name. */
const createTestId = (test: {
	lane: string;
	file: string;
	groups: string[];
	name: string;
}): string =>
	[`${test.lane}/${test.file}`, ...test.groups, test.name].join(" > ");

export default createTestId;
