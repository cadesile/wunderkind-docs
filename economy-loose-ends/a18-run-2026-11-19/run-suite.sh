#!/bin/bash
# A18 — full suite in 20-file batches, because a whole-suite phpunit OOM-kills on this box
# (exit 137, documented in .context/stages/01_overview/output/environment.md and A10's run).
# AdminShellCoverageTest is excluded: it cannot run on this box at all.
SP="$1"
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend
grep -v 'AdminShellCoverageTest' "$SP/suite-batches/_all-files.txt" > "$SP/suite-batches/_files.txt"
split -l 20 -d -a 3 "$SP/suite-batches/_files.txt" "$SP/suite-batches/chunk-"
: > "$SP/suite-batches/_summary.txt"
for chunk in "$SP"/suite-batches/chunk-*; do
  n=$(basename "$chunk")
  out="$SP/suite-batches/batch-${n#chunk-}.txt"
  files=$(tr '\n' ' ' < "$chunk")
  lando php vendor/bin/phpunit --no-coverage $files > "$out" 2>&1
  code=$?
  echo "$n exit=$code  $(grep -oE 'Tests: [0-9]+, Assertions: [0-9]+(, Failures: [0-9]+)?(, Errors: [0-9]+)?' "$out" | tail -1)" >> "$SP/suite-batches/_summary.txt"
done
echo "DONE" >> "$SP/suite-batches/_summary.txt"
