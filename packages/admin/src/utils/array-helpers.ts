export const moveArrayItem = <T>(
	items: T[],
	fromIndex: number,
	toIndex: number,
): T[] => {
	if (
		fromIndex === toIndex ||
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= items.length ||
		toIndex >= items.length
	) {
		return items;
	}

	const nextItems = items.slice();
	const [movedItem] = nextItems.splice(fromIndex, 1);

	if (movedItem === undefined) {
		return items;
	}

	nextItems.splice(toIndex, 0, movedItem);

	return nextItems;
};
