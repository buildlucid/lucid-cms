<script setup lang="ts">
import { ref, useId } from "vue";

const props = defineProps<{ start?: number }>();
const count = ref(props.start ?? 0);
const id = useId();
</script>

<template>
	<div class="vue-counter">
		<label :for="id">Vue count</label> <output :id="id">{{ count }}</output>
		<button type="button" @click="count++">Add one</button>
		<slot />
		<slot name="footer" />
	</div>
</template>

<style scoped>
.vue-counter {
	border: 1px dashed currentColor;
	padding: 1rem;
}
</style>
