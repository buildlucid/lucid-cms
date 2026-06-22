const shouldUseRemoteBindings = () => {
	const argv = typeof process === "undefined" ? [] : process.argv.slice(2);

	return argv.includes("--remote");
};

export default shouldUseRemoteBindings;
