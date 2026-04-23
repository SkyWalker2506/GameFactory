# BizLead #5 — Compliance

**Analyst:** BizLead (Sonnet)
**Date:** 2026-04-23
**Scope:** Claude Code CLI, Codex CLI, Gemini CLI ToS applicability to generate+publish derivative content

---

## Findings

### The Core Compliance Question

GameFactory uses subscription CLIs (Claude Code, Codex CLI, Gemini CLI) to generate game code, which is then published to Vercel and GitHub. Three distinct ToS surfaces apply:

1. Can users use these CLIs to generate code they publish commercially?
2. Can the generated output be sublicensed / distributed freely?
3. Does automation via `--yolo` / non-interactive mode violate the ToS?

**Important caveat:** ToS documents change frequently. The findings below are based on publicly available ToS as of the knowledge cutoff (August 2025) and reasonable inference. Each should be verified against the current ToS before any commercial launch.

### Claude Code CLI — Anthropic Usage Policy

**Assumed ToS basis:** Anthropic's Claude API Usage Policy and Claude.ai Terms of Service (as Claude Code is a Claude.ai product for Pro/Max subscribers).

Key provisions (as assumed from Anthropic's public policies):

- **Output ownership**: Anthropic's ToS generally grants users rights to outputs generated through their service. Anthropic does not claim ownership of user-generated outputs.
- **Commercial use of output**: Claude.ai and Claude Code outputs may be used commercially, subject to the prohibition on using Claude to create content that violates laws or third-party rights.
- **Automation**: Claude Code is explicitly designed for agentic/automated use cases. Running it via `claude -p --output-format json` in a non-interactive subprocess is within intended use.
- **Rate limiting / fair use**: Claude Pro subscription has rate limits. A 900-second agentic session likely consumes significant quota. Heavy automation may trigger fair-use throttling but is not a ToS violation per se.
- **Prohibited uses**: Generating malware, illegal content, or content designed to deceive. Standard game generation is not in scope.

**Assessment for OSS-tool model**: Low risk. Each user runs the CLI under their own Pro subscription. Anthropic does not prohibit using Claude Code to build tools — this is the explicit use case.

**Assessment for hosted SaaS**: Higher risk. If GameFactory runs the Claude Code CLI on behalf of third-party users (i.e., multiple users sharing one Pro subscription), this likely violates the "personal use" nature of a Pro subscription and the prohibition on reselling or sharing subscription access. This would require Anthropic Enterprise API agreements.

### Codex CLI — OpenAI Usage Policy

**Assumed ToS basis:** OpenAI's Terms of Use and API Usage Policies (Codex CLI uses a user's ChatGPT Plus / API key configuration).

Key provisions:

- **Output ownership**: OpenAI's Terms grant users ownership of their outputs, subject to OpenAI's non-exclusive license to use outputs for service improvement (though this can be opted out via API settings).
- **Commercial use**: Permitted for outputs. OpenAI explicitly allows commercial applications of generated content.
- **Automated pipelines**: Codex CLI is designed for agentic code generation. Non-interactive use is within scope.
- **No reselling access**: ChatGPT Plus is a personal subscription; sharing or reselling access to third parties is prohibited.
- **Copyright of generated code**: OpenAI's ToS states users are responsible for ensuring generated content does not infringe third-party IP. For standard game code (grid logic, HTML canvas games), infringement risk is low.

**Assessment for OSS-tool model**: Low risk, same as Claude.

**Assessment for hosted SaaS**: Same concern — cannot multiplex one ChatGPT Plus subscription for multiple end users.

### Gemini CLI — Google Terms of Service

**Assumed ToS basis:** Google's Gemini API Terms of Service and Google One / Gemini Advanced subscription terms.

Key provisions:

- **Output ownership**: Google's terms grant users rights to outputs. Google retains broad license to use inputs/outputs for model improvement unless in certain enterprise tiers.
- **Commercial use**: Gemini API outputs may be used commercially.
- **Automation**: Gemini CLI designed for agentic use; non-interactive invocation is permitted.
- **Data privacy concern (notable)**: Unlike Claude Pro or ChatGPT Plus, some Gemini Advanced tiers share conversation data with Google for model training by default. If GAME.md contains proprietary business logic or sensitive prompt content, this is a data hygiene concern.
- **No account sharing**: Standard personal subscription sharing restrictions apply.

**Assessment for OSS-tool model**: Low risk for most scenarios. Recommend noting the data training opt-out in documentation.

### The `--yolo` Flag and ToS

`opengame --yolo` bypasses confirmation prompts in the agentic loop. This is a feature of OpenGame, not a CLI ToS concern per se. The subscription CLIs do not prohibit non-interactive or automated invocation — they are explicitly designed for it. The `--yolo` concern is a security issue (SecLead scope), not a ToS compliance issue.

### Publishing Derivative Content (Vercel)

Each `gf ship` deploys an AI-generated game to Vercel. The game is:
- Generated from the user's GAME.md prompt (user owns the creative direction)
- AI-authored code (copyright status uncertain — likely public domain or user-owned per provider ToS)
- Publicly accessible on the internet

No ToS from any of the three providers prohibits publishing generated code as a web application. This is the primary use case for code generation tools.

### Copyright of AI-Generated Game Code

All three providers' ToS assert that the user is responsible for ensuring outputs don't infringe third-party IP. For procedurally generated game code using Vite + TypeScript + Tailwind scaffolds, the primary IP risk is:
- Game mechanics that closely mirror a copyrighted game (e.g., a Tetris clone) — potential copyright issue, but not a ToS violation
- Use of copyrighted assets (sprites, music) if any are hallucinated — unlikely in pure HTML/JS output

### Summary Table

| CLI | Output commercial use | Automation | Hosted SaaS risk | Data training |
|---|---|---|---|---|
| Claude Code (Pro) | Permitted | Permitted | High (personal sub) | Opt-out available |
| Codex (ChatGPT Plus) | Permitted | Permitted | High (personal sub) | API opt-out |
| Gemini (Advanced) | Permitted | Permitted | High (personal sub) | Requires attention |

---

## Severity

| Issue | Severity |
|---|---|
| All three CLIs prohibit subscription sharing — hosted SaaS model legally blocked | P0 (if SaaS) |
| Gemini Advanced may train on inputs by default — user data concern | P1 |
| No ToS review documentation in the project | P2 |
| No data processing agreement or privacy notice for end users | P2 (if SaaS) |

---

## Evidence

- `scripts/gf` generate command: `opengame -p "$(cat GAME.md)" --yolo` — runs under user's local CLI session
- `scripts/gf` ship command: `vercel deploy --prod --yes` — deploys to public internet
- `README.md`: "uses **your subscription CLIs**" — confirms personal-subscription model
- Commit `4829594`: timeout 900s — long-running sessions consuming subscription quota
- Compliance analysis based on assumed ToS provisions (Anthropic, OpenAI, Google) as of knowledge cutoff August 2025

---

## Recommendations

1. **(P0, if SaaS) Do not host subscription CLIs for third-party users** without Enterprise/API agreements with all three providers. Doing so risks account termination.

2. **(P1) Add a note in README** about Gemini Advanced data training: recommend users configure Gemini with a Workspace account (data training off) or Gemini API key (not Gemini Advanced subscription) if concerned about input privacy.

3. **(P2) Create a `docs/compliance.md`** that documents the ToS assumptions, the "bring your own subscription" model, and the user's responsibility for generated content.

4. **(P2) Add a section to `gf ship` output** reminding users that they are responsible for ensuring their game does not infringe third-party IP.

5. **(P1) Verify current ToS** for all three CLIs before any commercial launch — these documents change.

---

## Effort

- README compliance note: 30 minutes
- `docs/compliance.md`: 2 hours
- ToS verification: 2 hours reading per provider (6 hours total)
- Enterprise API agreements (if SaaS): significant procurement effort
