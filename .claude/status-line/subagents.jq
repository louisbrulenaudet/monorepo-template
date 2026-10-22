include "lib" {search: "./"};

# name, description, and label are model-written and rendered raw, so control
# characters are stripped before an escape sequence (OSC 52, say) reaches the terminal.
def clean: tostring | gsub("[\\x{00}-\\x{1f}\\x{7f}-\\x{9f}]"; "");

# Per-tick token deltas, not totals: a flat line is a stalled agent.
def spark:
  [range(1; length) as $i | [.[$i] - .[$i - 1], 0] | max] as $deltas
  | ($deltas | max // 0) as $top
  | $deltas
  | map(if $top > 0 then "▁▂▃▄▅▆▇█"[(. * 7 / $top | round):][:1] else "▁" end)
  | join("");

def tokens:
  (.tokenCount // 0) as $n
  | ($n | tok)
  + (if (.contextWindowSize // 0) > 0 then " (\($n * 100 / .contextWindowSize | pct))" else "" end);

def truncate($n): if length <= $n then . elif $n > 1 then .[:$n - 1] + "…" else "" end;

(.columns // 0) as $columns
| (now * 1000) as $now
| .tasks[]
| [
    (.name // .agentType // "agent" | clean),
    (.model // empty | sub("^claude-"; "")),
    (.effort // empty | tostring),
    (($now - .startTime) / 1000 | dur),
    tokens,
    (.tokenSamples // [] | spark | select(. != "")),
    (.status | select(. != "running") | clean)
  ] as $parts
| ($parts | (map(length) | add) + 3 * length) as $used
| (.label // .description // "" | clean | if $columns > 0 then truncate($columns - $used) else . end) as $label
| {id, content: ($parts + [$label | select(. != "")] | join(" · "))}
