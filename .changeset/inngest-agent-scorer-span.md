---
'@mastra/core': patch
---

Fixed post-run scorers on `createInngestAgent` attributing scores to an unexported internal workflow span instead of the run's stored `agent_run` span (#29795).
