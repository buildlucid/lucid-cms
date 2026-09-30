import type { z } from "zod";
import constants from "../../constants/constants.js";
import { agentInteractionRequestSchema } from "../../schemas/agent.js";
import { isJsonObject } from "../../utils/helpers/is-json-object.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import { copy, normalizeCopy } from "../i18n/index.js";
import prepareToolInput, { checkToolResult } from "./prepare-input.js";
import {
	toolDefinitionBase,
	toolDefinitionInternal,
} from "./tool-definition-internal.js";
import { toolDisplay } from "./tool-display.js";
import type {
	AgentToolDefinition,
	AgentToolPreparation,
	DefineAgentToolOptions,
	DefineInteractiveAgentToolOptions,
	ToolRunResult,
} from "./types.js";

/**
 * Defines a tool for agents. Register it with an agent's `tools`. It runs with
 * the run's authority, and an `interaction` pauses the run for one structured
 * response from the run owner or an agent manager for system runs.
 */
function defineAgentTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodObject,
	Response extends z.ZodObject,
>(
	options: DefineInteractiveAgentToolOptions<
		Name,
		Input,
		Output,
		Data,
		Response
	>,
): AgentToolDefinition<Name>;
function defineAgentTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(
	options: DefineAgentToolOptions<Name, Input, Output>,
): AgentToolDefinition<Name>;
function defineAgentTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodObject,
	Response extends z.ZodObject,
>(
	options:
		| DefineAgentToolOptions<Name, Input, Output>
		| DefineInteractiveAgentToolOptions<Name, Input, Output, Data, Response>,
): AgentToolDefinition<Name> {
	const definition = {
		...toolDefinitionBase(options),
		//* the transcript always shows a name, so an untitled tool uses its name with spaces
		title: normalizeCopy(options.title ?? options.name.replaceAll("_", " ")),
		target: "agent" as const,
		permissions: options.permissions,
		readOnly: options.readOnly ?? false,
		parallelSafe: options.parallelSafe ?? false,
		requiresApproval: options.requiresApproval ?? false,
		capabilities: options.capabilities,
		display: options.display && toolDisplay(options.input, options.display),
	};
	const checkResult = checkToolResult(options);

	if (!("interaction" in options)) {
		return {
			...definition,
			[toolDefinitionInternal]: {
				prepareInput: (input) =>
					prepareToolInput(
						{
							...options,
							requirements: options.requiredPermissions,
							checkResult,
						},
						input,
					),
			},
		};
	}

	const { interaction } = options;

	/** Saved data and responses are parsed with the current schemas, so stale or forged choices are refused. */
	const parseInteraction = async (
		data: unknown,
		response: unknown,
	): ServiceResponse<{
		data: z.output<Data>;
		response: z.output<Response>;
	}> => {
		const parsedData = await interaction.data.safeParseAsync(data);
		if (!parsedData.success) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 409,
					message: copy("server:agent.interaction.unavailable"),
				},
			};
		}

		const parsedResponse = await interaction
			.response(parsedData.data)
			.safeParseAsync(response);
		if (!parsedResponse.success) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 400,
					message: copy("server:agent.interaction.invalid"),
				},
			};
		}

		return {
			error: undefined,
			data: { data: parsedData.data, response: parsedResponse.data },
		};
	};

	return {
		...definition,
		interaction: { key: interaction.key, version: interaction.version },
		[toolDefinitionInternal]: {
			prepareInput: (input) =>
				prepareToolInput(
					{
						...options,
						requirements: options.requiredPermissions,
						handler: async (args) => {
							const parsed = await parseInteraction(
								args.execution.interaction?.data,
								args.execution.interaction?.response,
							);
							if (parsed.error) return parsed;

							return options.handler({ ...args, ...parsed.data });
						},
						checkResult,
					},
					input,
				),
			interaction: {
				prepareInput: (input) =>
					prepareToolInput(
						{
							...options,
							requirements: options.requiredPermissions,
							handler: interaction.prepare,
							checkResult: async (
								result,
								context,
							): Promise<ToolRunResult<AgentToolPreparation>> => {
								if ("output" in result) return checkResult(result, context);

								const { data, ...request } = result.interaction;
								const parsedRequest =
									agentInteractionRequestSchema.safeParse(request);
								const parsedData = await interaction.data.safeParseAsync(data);
								if (
									!parsedRequest.success ||
									!parsedData.success ||
									!isJsonObject(data) ||
									JSON.stringify(data).length >
										constants.agent.limits.interactionDataChars
								) {
									return {
										type: "failed",
										message: context.translate(
											"server:agent.interaction.invalid",
										),
									};
								}

								return {
									type: "success",
									data: { interaction: { ...parsedRequest.data, data } },
								};
							},
						},
						input,
					),
				//* the raw response is saved, and the handler parses it again with the schemas current when it runs
				parseResponse: async (data, response) => {
					const parsed = await parseInteraction(data, response);
					if (parsed.error) return parsed;
					if (!isJsonObject(response)) {
						return {
							data: undefined,
							error: {
								type: "basic",
								status: 400,
								message: copy("server:agent.interaction.invalid"),
							},
						};
					}

					return { error: undefined, data: response };
				},
			},
		},
	};
}

export default defineAgentTool;
