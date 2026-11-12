/**
 * Picks one of `items` by an action's input number, wrapping round the list, so any number picks
 * something. Throws on an empty list, which the action's `when` should rule out.
 */
const pick = <Item>(items: readonly Item[], index: number): Item => {
	const item = items[index % items.length];
	if (item === undefined) {
		throw new Error(
			"Nothing to pick. The action's `when` should rule this out.",
		);
	}
	return item;
};

export default pick;
