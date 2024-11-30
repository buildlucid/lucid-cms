import createServer from "./services/create-server.js";
import buildApp from "./services/build-app.js";
import shouldBuild from "./services/should-build.js";

const vite = {
	createServer,
	buildApp,
	shouldBuild,
};

export default vite;
