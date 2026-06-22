import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { afterEach, describe, expect, test } from "vitest";
import constants from "../constants.js";
import writeWranglerConfig from "./write-wrangler-config.js";

const tempDirs: string[] = [];

const createProject = async () => {
	const projectRoot = await mkdtemp(path.join(os.tmpdir(), "lucid-wrangler-"));
	tempDirs.push(projectRoot);
	const configPath = path.join(projectRoot, "lucid.config.ts");
	await writeFile(configPath, "");
	return {
		projectRoot,
		configPath,
		outputPath: projectRoot,
		buildOutputPath: path.join(projectRoot, "dist"),
	};
};

const readGeneratedConfig = async (filepath: string) =>
	parseJsonc(await readFile(filepath, "utf-8"));

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) =>
			rm(dir, {
				recursive: true,
				force: true,
			}),
		),
	);
});

describe("writeWranglerConfig", () => {
	test("generates bindings from prepare artifacts", async () => {
		const project = await createProject();
		const result = await writeWranglerConfig({
			configPath: project.configPath,
			outputPath: project.outputPath,
			target: "prepare",
			options: {
				worker: {
					name: "artifact-app",
				},
			},
			prepareArtifacts: {
				custom: [
					{
						type: constants.WRANGLER_CONFIG_ARTIFACT_TYPE,
						custom: {
							bindings: {
								d1: true,
								kv: "CACHE",
								r2: {
									bucketName: "media",
								},
								queues: {
									queueName: "jobs",
									consumer: {
										maxBatchSize: 1,
									},
								},
							},
						},
					},
				],
			},
		});

		expect(path.basename(result.generatedConfigPath ?? "")).toBe(
			constants.WRANGLER_DEV_CONFIG_FILE,
		);
		const config = await readGeneratedConfig(result.generatedConfigPath ?? "");

		expect(config.d1_databases).toEqual([
			{
				binding: "LUCID_D1",
				database_name: "artifact-app-lucid-d1",
			},
		]);
		expect(config.kv_namespaces).toEqual([
			{
				binding: "CACHE",
			},
		]);
		expect(config.r2_buckets).toEqual([
			{
				binding: "LUCID_MEDIA_BUCKET",
				bucket_name: "media",
			},
		]);
		expect(config.queues).toEqual({
			producers: [
				{
					binding: "LUCID_QUEUE",
					queue: "jobs",
				},
			],
			consumers: [
				{
					queue: "jobs",
					max_batch_size: 1,
				},
			],
		});
	});

	test("merges explicit runtime binding options over prepare artifacts", async () => {
		const project = await createProject();
		const result = await writeWranglerConfig({
			configPath: project.configPath,
			outputPath: project.outputPath,
			target: "prepare",
			options: {
				worker: {
					name: "override-app",
				},
				bindings: {
					r2: {
						binding: "MEDIA",
						bucketName: "runtime-media",
					},
				},
			},
			prepareArtifacts: {
				custom: [
					{
						type: constants.WRANGLER_CONFIG_ARTIFACT_TYPE,
						custom: {
							bindings: {
								r2: true,
							},
						},
					},
				],
			},
		});

		const config = await readGeneratedConfig(result.generatedConfigPath ?? "");

		expect(config.r2_buckets).toEqual([
			{
				binding: "MEDIA",
				bucket_name: "runtime-media",
			},
		]);
	});

	test("uses manual Wrangler config paths without generating", async () => {
		const project = await createProject();
		const manualConfigPath = path.join(project.projectRoot, "wrangler.jsonc");
		const generatedConfigPath = path.join(
			project.projectRoot,
			constants.WRANGLER_DEV_CONFIG_FILE,
		);
		await writeFile(manualConfigPath, "{}");
		await writeFile(
			generatedConfigPath,
			`// ${constants.WRANGLER_GENERATED_CONFIG_MARKER}\n{}\n`,
		);

		const result = await writeWranglerConfig({
			configPath: project.configPath,
			outputPath: project.outputPath,
			target: "prepare",
			options: {
				wrangler: "./wrangler.jsonc",
			},
		});

		expect(result).toEqual({
			configPath: manualConfigPath,
			generated: false,
		});
		await expect(readFile(generatedConfigPath, "utf-8")).rejects.toThrow();
	});

	test("does not delete the generated path when it is supplied as manual config", async () => {
		const project = await createProject();
		const generatedConfigPath = path.join(
			project.projectRoot,
			constants.WRANGLER_DEV_CONFIG_FILE,
		);
		await writeFile(generatedConfigPath, "{}");

		const result = await writeWranglerConfig({
			configPath: project.configPath,
			outputPath: project.outputPath,
			target: "prepare",
			options: {
				wrangler: "./wrangler.lucid.jsonc",
			},
		});

		expect(result).toEqual({
			configPath: generatedConfigPath,
			generated: false,
		});
		expect(await readFile(generatedConfigPath, "utf-8")).toBe("{}");
	});

	test("rejects overwriting an unmarked root generated config", async () => {
		const project = await createProject();
		await writeFile(
			path.join(project.projectRoot, constants.WRANGLER_DEV_CONFIG_FILE),
			"{}",
		);

		await expect(
			writeWranglerConfig({
				configPath: project.configPath,
				outputPath: project.outputPath,
				target: "prepare",
			}),
		).rejects.toThrow("does not include Lucid's generated-file marker");
	});

	test("removes stale build deploy redirects in manual mode", async () => {
		const project = await createProject();
		const deployConfigPath = path.join(
			project.projectRoot,
			constants.WRANGLER_DEPLOY_CONFIG_FILE,
		);
		const deployConfigDirectory = path.dirname(deployConfigPath);
		await mkdir(deployConfigDirectory, { recursive: true });
		await writeFile(path.join(project.projectRoot, "wrangler.jsonc"), "{}");
		await writeFile(
			deployConfigPath,
			JSON.stringify({
				configPath: path.relative(
					deployConfigDirectory,
					path.join(
						project.buildOutputPath,
						constants.WRANGLER_BUILD_CONFIG_FILE,
					),
				),
			}),
		);

		const result = await writeWranglerConfig({
			configPath: project.configPath,
			outputPath: project.buildOutputPath,
			target: "build",
			options: {
				wrangler: "./wrangler.jsonc",
			},
		});

		expect(result).toEqual({
			configPath: path.join(project.projectRoot, "wrangler.jsonc"),
			generated: false,
		});
		await expect(readFile(deployConfigPath, "utf-8")).rejects.toThrow();
	});
});
