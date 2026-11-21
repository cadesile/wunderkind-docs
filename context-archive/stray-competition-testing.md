# Stray: backend competition console commands

Moved out of `wunderkind-app/.context/shared/competition-testing.md` on 2026-11-20. It was a
3-line scratchpad of `wunderkind-backend` Symfony console commands sitting in the app repo's
context tree with zero inbound references from anywhere in `.context/`.

Kept rather than deleted because the commands themselves look useful; they belong in
`wunderkind-backend`'s own docs, not in the app's ICM tree.

```text
Summary — the two commands you'll be running on a loop
│ app:competition:provision-instances │ Opens a REGISTERING instance per active template
│ app:competition:process-rounds      │ Resolves any due round, advances the bracket    ```
