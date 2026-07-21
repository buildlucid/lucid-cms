type IndexDefinition = {
	columns: string[];
	unique?: boolean;
};

/** Returns whether two index definitions have the same ordered columns and uniqueness. */
const indexesMatch = (left: IndexDefinition, right: IndexDefinition): boolean =>
	left.columns.length === right.columns.length &&
	left.columns.every((column, index) => right.columns[index] === column) &&
	(left.unique ?? false) === (right.unique ?? false);

export default indexesMatch;
