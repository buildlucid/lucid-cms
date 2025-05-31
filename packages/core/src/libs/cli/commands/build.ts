import installOptionalDeps from "../utils/install-optional-deps.js";

const buildCommand = async () => {
	await installOptionalDeps();

	console.log("Building...");
};

export default buildCommand;
