import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
		outputPath: path.join(projectRoot, "dist"),
	};
};

const readGeneratedConfig = async (filepath: string) =>
	JSON.parse(await readFile(filepath, "utf-8"));

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

	test("skips generation when wrangler is false", async () => {
		const project = await createProject();

		await expect(
			writeWranglerConfig({
				configPath: project.configPath,
				outputPath: project.outputPath,
				target: "prepare",
				options: {
					wrangler: false,
				},
			}),
		).resolves.toEqual({});
	});
});
