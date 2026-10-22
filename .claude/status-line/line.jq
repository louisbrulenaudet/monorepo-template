include "lib" {search: "./"};

def model:
  (.model.display_name // .model.id // "claude")
  + (if .effort.level then " · \(.effort.level)" else "" end)
  + (if .fast_mode == true then " · fast" else "" end);

def context:
  .context_window as $cw
  | ($cw.context_window_size // 0) as $size
  | ($cw.total_input_tokens // 0) as $in
  | ($cw.used_percentage // (if $size > 0 then $in * 100 / $size else null end)) as $used
  | if $used == null then "ctx n/a"
    elif $size > 0 then "ctx \($used | pct) (\([$size - $in, 0] | max | tok) left)"
    else "ctx \($used | pct)" end;

# Pace assumes the window started at resets_at - $w; projecting before a tenth of it has elapsed is noise.
def quota($label; $w):
  select(.used_percentage != null and .resets_at != null)
  | .used_percentage as $used
  | (.resets_at - now) as $left
  | ($w - $left) as $elapsed
  | (if $elapsed >= $w / 10 and $used > 0 and $used < 100 and $used * $w / $elapsed >= 100
     then " full ~\((100 - $used) * $elapsed / $used | dur)"
     else "" end) as $full
  | "\($label) \($used | pct)\($full) ↺\($left | dur)";

def cache:
  select(.hit_ratio != null)
  | "cache \(.hit_ratio * 100 | pct) · "
  + if .warm and .expires_at != null then "warm \(.expires_at - now | dur)"
    elif .warm then (.ttl // "warm")
    elif .recache_tokens_if_cold then "cold ↻\(.recache_tokens_if_cold | tok)"
    else "cold" end;

def misses:
  select((.misses // 0) > 0)
  | "\(.misses) miss\(if .misses > 1 then "es" else "" end)"
  + (.last_miss_cause.causes[0] as $cause | if $cause then ": \($cause)" else "" end);

def cost:
  .cost.total_cost_usd
  | select(. != null)
  | (. * 100 | round) as $cents
  | "$\($cents / 100 | floor).\($cents % 100 + 100 | tostring | .[1:])";

def branch:
  (.worktree.name // .workspace.git_worktree) as $worktree
  | [($git_branch | select(. != "")), ($worktree // empty | "@\(.)")]
  | select(length > 0)
  | join(" ");

# p is the drop priority: the highest p goes first when the line is too wide, 0 never goes.
def seg($p): {p: $p, t: .};

def width: (map(.t | length) | add // 0) + 3 * ([length - 1, 0] | max);

# Not $max: a $name parameter also defines the filter name, which would shadow the max builtin below.
def fit($limit):
  if $limit <= 0 or width <= $limit then .
  else (map(.p) | max) as $top
    | if $top == 0 then . else del(.[map(.p) | indices($top) | last]) | fit($limit) end
  end;

[
  (model | seg(0)),
  (context | seg(0)),
  (.rate_limits.five_hour | quota("5h"; 18000) | seg(1)),
  (.prompt_cache | cache | seg(2)),
  (.prompt_cache | misses | seg(6)),
  (.rate_limits.seven_day | quota("7d"; 604800) | seg(3)),
  (cost | seg(4)),
  (branch | seg(5))
]
| fit(($cols | tonumber? // 0) - 4)
| map(.t)
| join(" │ ")
