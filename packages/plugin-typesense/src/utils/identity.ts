/** Encodes identities without exposing Typesense filter syntax to configured keys. */
export const ownerId = (source: string, itemId: number) =>
	encodeURIComponent(JSON.stringify([source, itemId])).replace(
		/[!'()*]/g,
		(character) => `%${character.charCodeAt(0).toString(16)}`,
	);

export const recordId = (data: {
	source: string;
	itemId: number;
	locale: string | null;
	id: string;
}) =>
	encodeURIComponent(
		JSON.stringify([data.source, data.itemId, data.locale, data.id]),
	);
