const parseKVValue = <R>(value: string): R => {
	try {
		return JSON.parse(value) as R;
	} catch {
		return value as R;
	}
};

export default parseKVValue;
