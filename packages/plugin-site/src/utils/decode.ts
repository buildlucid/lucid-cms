const decode = (value: string) => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

export default decode;
