/** Reads a `<collectionKey>:<id>` document ID, as written in export file refs. */
const parseDocumentId = (value: string) => {
	const separator = value.lastIndexOf(":");
	const id = Number(value.slice(separator + 1));
	if (separator < 1 || !Number.isInteger(id) || id < 1) return null;

	return { collectionKey: value.slice(0, separator), id };
};

export default parseDocumentId;
