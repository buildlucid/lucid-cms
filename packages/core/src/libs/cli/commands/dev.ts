import installOptionalDeps from "../utils/install-optional-deps.js";

const devCommand = async () => {
	await installOptionalDeps();

	console.log("Dev...");
};

export default devCommand;
