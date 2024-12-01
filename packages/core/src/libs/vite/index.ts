import createServer from "./services/create-server.js";
import buildApp from "./services/build-app.js";
import shouldBuild from "./services/should-build.js";
import getPaths from "./services/get-paths.js";

const vite = {
	createServer,
	buildApp,
	shouldBuild,
	getPaths,
};

export default vite;
