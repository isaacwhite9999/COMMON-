// Authenticated research assistant. No tools, transactions, private-circle access, or automatic execution.
import { handleResearch } from "./handler.ts";
Deno.serve(req=>handleResearch(req,{env:(name)=>Deno.env.get(name),fetch:globalThis.fetch}));
