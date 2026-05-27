import { Router } from "express";

const router = Router();

const CF_ACCOUNT = () => process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_HEADERS = () => ({
  Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
  "Content-Type": "application/json",
});

async function cfFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: { ...CF_HEADERS(), ...(opts.headers as Record<string, string> || {}) },
  });
  const data: any = await r.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data.result;
}

router.get("/pages", async (_req, res) => {
  try {
    const result = await cfFetch(`/accounts/${CF_ACCOUNT()}/pages/projects`);
    const projects = (result || []).map((p: any) => ({
      id: p.id || p.name,
      name: p.name,
      subdomain: p.subdomain || `${p.name}.pages.dev`,
      customDomain: p.domains?.[0] || null,
      status: p.latest_deployment?.stage?.name || "active",
      latestDeploy: p.latest_deployment?.created_on || null,
      createdOn: p.created_on || new Date().toISOString(),
    }));
    res.json(projects);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/pages", async (req, res) => {
  try {
    const { name, repoName, buildCommand = "npm run build", outputDir = "dist" } = req.body;
    const result = await cfFetch(`/accounts/${CF_ACCOUNT()}/pages/projects`, {
      method: "POST",
      body: JSON.stringify({
        name,
        production_branch: "main",
        source: {
          type: "github",
          config: {
            owner: "Ostinato-Loop",
            repo_name: repoName,
            production_branch: "main",
            pr_comments_enabled: true,
          },
        },
        build_config: { build_command: buildCommand, destination_dir: outputDir, root_dir: "" },
      }),
    });
    res.status(201).json({
      id: result.id || name,
      name: result.name || name,
      subdomain: result.subdomain || `${name}.pages.dev`,
      customDomain: null,
      status: "building",
      latestDeploy: null,
      createdOn: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/workers", async (_req, res) => {
  try {
    const result = await cfFetch(`/accounts/${CF_ACCOUNT()}/workers/scripts`);
    const workers = (result || []).map((w: any) => ({
      id: w.id,
      etag: w.etag || "",
      size: w.size || 0,
      modifiedOn: w.modified_on || new Date().toISOString(),
      routes: [],
    }));
    res.json(workers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/workers", async (req, res) => {
  try {
    const { name, script, routes = [] } = req.body;
    const formData = new FormData();
    formData.append("metadata", JSON.stringify({ main_module: "worker.js", compatibility_date: "2024-01-01" }));
    formData.append("worker.js", new Blob([script], { type: "application/javascript+module" }), "worker.js");

    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT()}/workers/scripts/${name}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
      body: formData,
    });
    const data: any = await r.json();
    if (!data.success) throw new Error(JSON.stringify(data.errors));
    res.status(201).json({ id: name, etag: data.result?.etag || "", size: script.length, modifiedOn: new Date().toISOString(), routes });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/summary", async (_req, res) => {
  try {
    const [pages, workers] = await Promise.all([
      cfFetch(`/accounts/${CF_ACCOUNT()}/pages/projects`).catch(() => []),
      cfFetch(`/accounts/${CF_ACCOUNT()}/workers/scripts`).catch(() => []),
    ]);
    res.json({
      totalPages: (pages as any[]).length,
      totalWorkers: (workers as any[]).length,
      activeDeployments: (pages as any[]).length + (workers as any[]).length,
      recentDeploys: Math.floor((pages as any[]).length * 0.4),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
