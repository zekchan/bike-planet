<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project code conventions

- Keep `page.tsx` and `layout.tsx` thin. They should compose route-level features, not contain large UI trees, data-fetching state machines, or reusable calculations.
- Put UI used by only one route in a `components/` directory next to that route's `page.tsx`. Promote a component to a shared directory only after it is genuinely reused by multiple routes.
- Put non-trivial route-specific React hooks in a `hooks/` directory next to the route. Keep plain types and framework-independent utilities in focused route-level modules.
- Prefer local state, a custom hook, and explicit props. Add React context only when state must cross several distant component branches and prop passing has become materially awkward.
- Use Server Components by default. Place the client boundary at the smallest practical interactive coordinator and keep server-only work out of client modules.
- Keep routing-engine integration, scoring, and other privileged logic in server route handlers or server-only modules.
- Use pnpm through Corepack. Do not add npm or Yarn lockfiles. Before changing tool or dependency versions, check the actual registry tags instead of relying on a locally cached version.
- Use TypeScript 7 with `experimental.useTypeScriptCli`. Keep types explicit at API and component boundaries and avoid unsafe assertions.
- Use Biome for formatting and linting. Do not add ESLint or Prettier. Run `pnpm check` and `pnpm build` before handing work off.
- Do not add automated tests unless the user asks for them.
