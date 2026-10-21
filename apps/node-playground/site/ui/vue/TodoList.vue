<script setup lang="ts">
import { computed, ref, useId } from "vue";

/** A small to-do list seeded from `items`, with Kiln content in the default and `footer` slots. */
const props = defineProps<{ items?: string[] }>();
const todos = ref(
	(props.items ?? []).map((text, index) => ({ id: index, text, done: false })),
);
const draft = ref("");
const remaining = computed(() => todos.value.filter((todo) => !todo.done).length);
const inputId = useId();

const add = () => {
	const text = draft.value.trim();
	if (!text) return;
	todos.value.push({ id: Date.now(), text, done: false });
	draft.value = "";
};
</script>

<template>
	<div class="todo-list">
		<slot />
		<form @submit.prevent="add">
			<label class="visually-hidden" :for="inputId">New to-do</label>
			<input :id="inputId" v-model="draft" placeholder="New to-do" />
			<button type="submit">Add</button>
		</form>
		<ul>
			<li v-for="todo in todos" :key="todo.id">
				<label><input v-model="todo.done" type="checkbox" /> {{ todo.text }}</label>
			</li>
		</ul>
		<p>{{ remaining }} left</p>
		<slot name="footer" />
	</div>
</template>

<style scoped>
.todo-list {
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 1rem;
}

form {
	display: flex;
	gap: 0.5rem;
}

ul {
	list-style: none;
	padding: 0;
}
</style>
