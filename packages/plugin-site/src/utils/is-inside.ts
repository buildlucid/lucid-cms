import path from "node:path";

/** Checks `child` is `parent` or sits somewhere inside it. */
const isInside = (parent: string, child: string) => {
	const relative = path.relative(parent, child);
	return (
		relative !== ".." &&
		!relative.startsWith(`..${path.sep}`) &&
		!path.isAbsolute(relative)
	);
};

export default isInside;
