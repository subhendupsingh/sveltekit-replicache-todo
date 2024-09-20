<script lang='ts'>
    import getRandomID from "$lib";
    import TodoItem from "$lib/components/todo-item.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import Separator from "$lib/components/ui/separator/separator.svelte";
    import type { M } from "$lib/mutators";
    import type { Todo } from "$lib/types";
    import type { Replicache } from "replicache";
    import { onMount } from "svelte";
    import type { PageData } from "./$types";
    import { createClient } from "@supabase/supabase-js";
    import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
    
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
    
    export let data: PageData;
    let todos: Partial<Todo>[] = [];
    let todoText: string;
    const replicache: Replicache<M> = data.replicache;

    // Calling the mutation to create a new Todo
    // This same mutation with the args passed here will be replayed on the server
    // in the push request.
    // see mutators.ts
    const createTodo = async () => {
        const id = getRandomID();
        await replicache.mutate.createTodo({
            id,
            text: todoText,
            completed: false,
            deleted: false,
        });
    }

    const repliDataToTodo = (data: any[]): Partial<Todo>[] => {
        return data.map((d) => {
            return {
                id: d[1].id as string,
                text: d[1].text as string,
                completed: d[1].completed as boolean,
            }
        });
    }

    // Replicache query subscription for real-time updates
    const subscribeTodos = async () => {
        const unsubscribe = replicache?.subscribe(
            async(tx) => {
                return await tx.scan({prefix: 'todo/'}).entries().toArray();
            },
            {
                onData(result) {
                    console.log(repliDataToTodo(result));
                    todos = repliDataToTodo(result);
                },
            }
        )

        return unsubscribe;
    }

    // Supabase realtime listener to invoke pull when the changes are received
    // Poke in replicache terminology
    const listenRemoteTodoChanges = async () => {
        const unslisten = supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, async (payload) => {
            console.log('Change received!', payload)
            await replicache.pull({ now: true });
        })
        .subscribe((status, err) => { 
            if(err) console.log("SUBSCRIPTION ERROR:", err);
            else console.log("SUBSCRIPTION STATUS CHANGED:", status);
        })

        return unslisten;
    }

    onMount(async () => {
        const unsubscribe = await subscribeTodos();
        const unslisten = await listenRemoteTodoChanges();

        return {
            destroy() {
                console.log('unsubscribing from replicache');
                unsubscribe();
                unslisten?.unsubscribe();
            }
        }
    });
</script>

<div class="min-h-screen flex flex-col gap-4 max-w-screen-sm lg:max-w-screen-md mx-auto my-16">
    <h1 class="text-3xl font-bold">Todos with replicache</h1>
    
    <div class="flex gap-4 mt-6">
        <Input bind:value={todoText} placeholder="Add a todo" class="w-3/4" />
        <Button variant="default" class="w-1/4" on:click={() => createTodo()}>Add</Button>
    </div>

    <Separator class="my-6" />

    {#each todos as todo}
        <TodoItem {replicache} {todo} />
    {/each}

    <div class="sticky bottom-0 flex w-full mt-auto justify-center text-sm text-gray-500 pb-4">
        Tutorial by <a class="underline ml-1 text-orange-500" href="https://shootmail.app">Shootmail</a>
    </div>
</div>