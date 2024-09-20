import { PUBLIC_DEFAULT_USER, PUBLIC_REP_LICENSE } from "$env/static/public";
import { initReplicache } from "$lib";
import type { PageLoad } from "./$types";

export const ssr = false;

export const load: PageLoad = async () => {
    const replicache = initReplicache(PUBLIC_REP_LICENSE, PUBLIC_DEFAULT_USER);

    return {
        replicache
    }
};