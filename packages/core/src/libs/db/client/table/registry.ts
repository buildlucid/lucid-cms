import { LucidError } from "../../../../utils/errors/index.js";
import type DatabaseAdapter from "../../adapter-base.js";
import type { LucidDB } from "../../types.js";
import type { ResolvedTableDefinition, TableDefinition } from "./definition.js";

/** Resolves exact and generated table names to their query metadata. */
export default class TableRegistry {
	readonly #adapter: DatabaseAdapter;
	readonly #exact = new Map<string, ResolvedTableDefinition>();
	readonly #patterns: ResolvedTableDefinition[] = [];
	readonly #resolved = new WeakMap<TableDefinition, ResolvedTableDefinition>();

	constructor(
		adapter: DatabaseAdapter,
		definitions: readonly TableDefinition[] = [],
	) {
		this.#adapter = adapter;
		for (const definition of definitions) this.register(definition);
	}

	register(definition: TableDefinition) {
		const resolved = definition.resolve(this.#adapter);
		this.registerResolved(resolved);
		this.#resolved.set(definition, resolved);
	}

	registerResolved(definition: ResolvedTableDefinition) {
		if (definition.matches) {
			const duplicate = this.#patterns.find(
				(item) => item.name === definition.name,
			);
			if (duplicate) {
				throw new LucidError({
					message: `Table definition already registered: ${definition.name}`,
				});
			}
			this.#patterns.push(definition);
			this.#patterns.sort((a, b) => b.priority - a.priority);
			return;
		}

		if (this.#exact.has(definition.name)) {
			throw new LucidError({
				message: `Table definition already registered: ${definition.name}`,
			});
		}
		this.#exact.set(definition.name, definition);
	}

	resolve<Name extends keyof LucidDB>(
		tableName: Name,
	): ResolvedTableDefinition<Name> | undefined;
	resolve(tableName: string): ResolvedTableDefinition | undefined;
	resolve(tableName: string): ResolvedTableDefinition | undefined {
		return (
			this.#exact.get(tableName) ??
			this.#patterns.find((definition) => definition.matches?.(tableName))
		);
	}

	resolveDefinition<Name extends keyof LucidDB>(
		definition: TableDefinition<Name>,
	): ResolvedTableDefinition<Name> | undefined {
		return this.#resolved.get(definition) as
			| ResolvedTableDefinition<Name>
			| undefined;
	}

	get definitions(): readonly ResolvedTableDefinition[] {
		return [...this.#exact.values(), ...this.#patterns];
	}
}
