const MAX_DETAILS = 10;

/** Caps a build warning's detail lines, ending with how many were left out. */
const limitDetails = (items: string[]) =>
	items.length > MAX_DETAILS
		? [...items.slice(0, MAX_DETAILS), `and ${items.length - MAX_DETAILS} more`]
		: items;

export default limitDetails;
