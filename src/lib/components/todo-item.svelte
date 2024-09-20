<script lang="ts">
    import type { Todo } from "$lib/types";
    import type { Replicache } from "replicache";
    import Checkbox from "./ui/checkbox/checkbox.svelte";
    import type { M } from "$lib/mutators";
    
    export let todo: Partial<Todo>;
    export let replicache: Replicache<M>;

    const updateTodo = async () => {
        await replicache.mutate.updateTodo({
            id: todo.id,
            text: todo.text,
            completed: !todo.completed
        })
    }
</script>

<div class="flex items-center">
    <Checkbox bind:checked={todo.completed} onCheckedChange={() => updateTodo()} />
    {todo.completed}
    {#if todo.completed}
        <span class="ml-2 line-through">{todo.text}</span>
    {:else}
        <span class="ml-2">{todo.text}</span>
    {/if}
</div>