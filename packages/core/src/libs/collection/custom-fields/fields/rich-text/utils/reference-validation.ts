export const isReferenceId = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value) && value > 0;

export const collectionIsAllowed = (
	config: boolean | string[] | undefined,
	collectionKey: string,
) =>
	config === true || (Array.isArray(config) && config.includes(collectionKey));
