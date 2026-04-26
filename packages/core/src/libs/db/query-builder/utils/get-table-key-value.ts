import type { ReferenceExpression } from "kysely";

const getTableKeyValue = <DB, Table extends keyof DB>(
	key: string,
	keyMap?: Record<string, ReferenceExpression<DB, Table>>,
): ReferenceExpression<DB, Table> | undefined => {
	if (keyMap?.[key]) {
		return keyMap[key];
	}
	return undefined;
};

export default getTableKeyValue;
