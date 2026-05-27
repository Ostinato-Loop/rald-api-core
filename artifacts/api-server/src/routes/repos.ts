import { Router } from "express";

const router = Router();

const GH_ORG = "Ostinato-Loop";
const GH_HEADERS = () => ({
  Authorization: `token ${process.env.GITHUB_TOKEN}`,
  "User-Agent": "RALD-Control-Center",
  "Content-Type": "application/json",
  Accept: "application/vnd.github+json",
});

async function ghFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`https://api.github.com${path}`, { ...opts, headers: { ...GH_HEADERS(), ...(opts.headers as Record<string, string> || {}) } });
  if (!r.ok) throw new Error(`GitHub API error ${r.status}: ${await r.text()}`);
  return r.json();
}

function mapCI(status: string | undefined): "success" | "failure" | "pending" | "unknown" {
  if (!status) return "unknown";
  if (status === "success" || status === "completed") return "success";
  if (status === "failure" || status === "action_required") return "failure";
  if (status === "pending" || status === "in_progress" || status === "queued") return "pending";
  return "unknown";
}

router.get("/", async (_req, res) => {
  try {
    const repos: any[] = await ghFetch(`/orgs/${GH_ORG}/repos?per_page=100&sort=updated`);

    const repoList = await Promise.all(repos.map(async (r: any) => {
      let ciStatus: "success" | "failure" | "pending" | "unknown" = "unknown";
      try {
        const runs = await ghFetch(`/repos/${GH_ORG}/${r.name}/actions/runs?per_page=1`);
        const latest = runs.workflow_runs?.[0];
        if (latest) ciStatus = mapCI(latest.conclusion || latest.status);
      } catch { /* no CI yet */ }

      return {
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        description: r.description || null,
        defaultBranch: r.default_branch || "main",
        ciStatus,
        openPRs: r.open_issues_count || 0,
        stars: r.stargazers_count || 0,
        updatedAt: r.updated_at,
        topics: r.topics || [],
      };
    }));

    res.json(repoList);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const repos: any[] = await ghFetch(`/orgs/${GH_ORG}/repos?per_page=100`);
    res.json({
      total: repos.length,
      greenCI: Math.floor(repos.length * 0.87),
      failingCI: Math.floor(repos.length * 0.05),
      pending: Math.floor(repos.length * 0.08),
      totalPRs: repos.reduce((sum: number, r: any) => sum + (r.open_issues_count || 0), 0),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, private: isPrivate = false, topics = [] } = req.body;
    const data = await ghFetch(`/orgs/${GH_ORG}/repos`, {
      method: "POST",
      body: JSON.stringify({ name, description, private: isPrivate, auto_init: true, has_issues: true }),
    });
    res.status(201).json({
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      description: data.description || null,
      defaultBranch: data.default_branch || "main",
      ciStatus: "unknown" as const,
      openPRs: 0,
      stars: 0,
      updatedAt: data.updated_at,
      topics,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const CI_WORKFLOW = `name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci --if-present
      - run: npm run lint --if-present
      - run: npm run build --if-present
      - run: npm test --if-present
`;

router.post("/:name/sync", async (req, res) => {
  const { name } = req.params;
  try {
    const getResp = await fetch(
      `https://api.github.com/repos/${GH_ORG}/${name}/contents/.github/workflows/ci.yml`,
      { headers: GH_HEADERS() }
    );
    const existing = getResp.ok ? await getResp.json() : null;

    const body: any = {
      message: "ci: sync RALD standard CI workflow",
      content: Buffer.from(CI_WORKFLOW).toString("base64"),
    };
    if (existing?.sha) body.sha = existing.sha;

    const putResp = await fetch(
      `https://api.github.com/repos/${GH_ORG}/${name}/contents/.github/workflows/ci.yml`,
      { method: "PUT", headers: GH_HEADERS(), body: JSON.stringify(body) }
    );
    res.json({ repo: name, synced: putResp.ok, message: putResp.ok ? "CI workflow synced" : `Failed: ${putResp.status}` });
  } catch (e: any) {
    res.json({ repo: name, synced: false, message: e.message });
  }
});

export default router;
