/**
 * Loaded into a measured command with `node --import`. When the command exits, it writes the
 * process's own CPU time and peak memory to the file named in `HARNESS_MEASURE_OUTPUT`.
 */
import { writeFileSync } from "node:fs";

export const MEASURE_OUTPUT_ENV = "HARNESS_MEASURE_OUTPUT";

export type ProcessUsage = {
	cpuMs: number;
	peakMemoryBytes: number;
};

const output = process.env[MEASURE_OUTPUT_ENV];
if (output) {
	process.on("exit", () => {
		const usage = process.resourceUsage();
		writeFileSync(
			output,
			JSON.stringify({
				cpuMs: (usage.userCPUTime + usage.systemCPUTime) / 1000,
				//* reported in kilobytes
				peakMemoryBytes: usage.maxRSS * 1024,
			} satisfies ProcessUsage),
		);
	});
}
