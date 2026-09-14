/** Reads a required element and checks its type when a page is initialized. */
export const element = <T extends HTMLElement>(
	id: string,
	type: { new (): T },
): T => {
	const node = document.getElementById(id);
	if (!(node instanceof type))
		throw new Error(`Missing or invalid element: ${id}`);
	return node;
};
