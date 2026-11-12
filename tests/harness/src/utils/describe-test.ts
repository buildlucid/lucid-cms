/**
 * A test as people read it: its file without the test suffix, then its describe blocks and name,
 * such as `documents/listing › listing documents › sorts by a field`.
 */
const describeTest = (file: string, names: readonly string[]): string =>
	[file.replace(/\.(test|spec|bench)\.ts$/, ""), ...names].join(" › ");

export default describeTest;
