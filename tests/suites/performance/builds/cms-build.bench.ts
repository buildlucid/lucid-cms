import path from "node:path";
import {
	benchmark,
	getLauncher,
	measureDirectory,
	runMeasured,
} from "#harness/performance";

/** Builds the setup with `lucidcms build`, and measures the build and what it wrote. */
benchmark({
	id: "build",
	sample: async ({ setup, env, work }) => {
		const { output } = getLauncher(setup.runtime);
		const assets = path.join(setup.directory, output.assets);

		const build = await runMeasured({
			command: "lucidcms",
			args: ["build"],
			cwd: setup.directory,
			env,
			log: path.join(work, "build.log"),
		});
		const server = await measureDirectory(
			path.join(setup.directory, output.root),
			{ exclude: assets },
		);
		const client = await measureDirectory(assets);

		return {
			duration: { label: "Build time", unit: "ms", value: build.durationMs },
			cpu: { label: "Build CPU time", unit: "ms", value: build.cpuMs },
			memory: {
				label: "Build peak memory",
				unit: "bytes",
				value: build.peakMemoryBytes,
			},
			"server.size": {
				label: "Server size",
				unit: "bytes",
				value: server.bytes,
			},
			"server.gzip": {
				label: "Server size (gzip)",
				unit: "bytes",
				value: server.gzipBytes,
			},
			"assets.size": {
				label: "Assets size",
				unit: "bytes",
				value: client.bytes,
			},
			"assets.files": {
				label: "Assets files",
				unit: "count",
				value: client.files,
			},
		};
	},
});
