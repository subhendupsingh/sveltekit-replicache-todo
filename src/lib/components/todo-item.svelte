<script lang="ts">
    import type { Todo } from "$lib/types";
    import type { Replicache } from "replicache";
    import Checkbox from "./ui/checkbox/checkbox.svelte";
    import type { M } from "$lib/mutators";
    
    export let todo: Partial<Todo>;
    export let replicache: Replicache<M>;
    export let index: number;

    // Calling the mutation to update the Todo
    // This same mutation with the args passed here will be replayed on the server
    // in the push request.
    // see mutators.ts
    const updateTodo = async () => {
        await replicache.mutate.updateTodo({
            id: todo.id,
            text: todo.text,
            completed: !todo.completed
        })
    }
</script>

<div class="flex items-center my-4">
    <Checkbox bind:checked={todo.completed} onCheckedChange={() => updateTodo()} />
    {#if todo.completed}
        <span class="ml-2 line-through">{index+1}. {todo.text}</span>
    {:else}
        <span class="ml-2">{index+1}. {todo.text}</span>
    {/if}
</div>