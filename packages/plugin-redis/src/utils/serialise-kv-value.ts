const serialiseKVValue = (value: unknown) =>
	typeof value === "string" ? value : JSON.stringify(value);

export default serialiseKVValue;
