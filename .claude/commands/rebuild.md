---
description: Trigger a production rebuild so published Sanity content goes live
---

The site is statically built: Sanity publishes do NOT appear on the live site
until a rebuild runs (see docs/agent/deployment.md). This command triggers one.

1. Check for uncommitted work first: `git status -sb`. If the tree is dirty,
   stop and ask the user whether to commit those changes (a push would deploy
   them) or stash them. Never bundle unrelated dirty files into a rebuild.

2. If the tree is clean, trigger the rebuild with an empty commit:

   ```
   git commit --allow-empty -m "chore: trigger production rebuild for published Sanity content"
   git push origin main
   ```

   The `deploy.yml` workflow (GitHub Actions) runs `npm run build` (which
   re-fetches all Sanity content at build time) and deploys. Live in a few
   minutes. `gh workflow run deploy.yml` does the same without a commit.

3. Tell the user how to confirm: watch the Deploy run in GitHub Actions, or reload the changed page after about 3 minutes (hard refresh;
   the edge cache can serve stale HTML briefly).

Note: if rebuild-on-publish should be automatic, the durable fix is the
Sanity webhook that sends a GitHub `repository_dispatch` (which `deploy.yml` listens for), described in
docs/agent/deployment.md ("Sanity to live site rebuild model"). Offer to walk
the user through it if they are triggering manual rebuilds repeatedly.
