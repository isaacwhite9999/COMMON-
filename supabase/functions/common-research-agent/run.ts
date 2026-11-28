export type ResearchRun = {
 workspace_id: string;
 goal: string;
 evidence: string;
 lease_token: string;
};

export type RunBoundary = {
 claim: (id: string, owner: string, version: number) => Promise<ResearchRun | undefined>;
 finish: (id: string, owner: string, lease: string, draft: string | null, status: string | null) => Promise<boolean>;
};

export function createRunBoundary(url: string, key: string, fetcher: typeof fetch): RunBoundary {
 async function rpc(name: string, body: unknown) {
  const response = await fetcher(url.replace(/\/$/, "") + "/rest/v1/rpc/" + name, {
   method: "POST",
   headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
   body: JSON.stringify(body),
   redirect: "error",
   signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Error("Research run service unavailable");
  return await response.json();
 }
 return {
  async claim(id, owner, version) {
   const result = await rpc("claim_research_assistant_run", { p_id: id, p_owner: owner, p_version: version });
   if (!Array.isArray(result)) throw Error("Invalid research claim");
   return result[0];
  },
  async finish(id, owner, lease, draft, status) {
   return await rpc("finish_research_assistant_run", {
    p_id: id, p_owner: owner, p_lease: lease, p_draft: draft, p_result_status: status,
   }) === true;
  },
 };
}
