import constants from "../../../constants/constants.js";

const documentTablePrefix =
	`${constants.db.prefix}document${constants.db.nameSeparator}` as const;

export type LucidDocumentTableName = `${typeof documentTablePrefix}${string}`;

export const isDocumentTableName = (
	tableName: string,
): tableName is LucidDocumentTableName =>
	tableName.startsWith(documentTablePrefix);
