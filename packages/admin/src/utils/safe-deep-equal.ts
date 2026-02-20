import deepEqual from "fast-deep-equal";

const safeDeepEqual = (a: unknown, b: unknown): boolean => {
	try {
		return deepEqual(a, b);
	} catch {
		return false;
	}
};

export default safeDeepEqual;
