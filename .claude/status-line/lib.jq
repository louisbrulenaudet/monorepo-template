def dur:
  ([., 0] | max | floor) as $s
  | if $s >= 86400 then "\($s / 86400 | floor)d\($s % 86400 / 3600 | floor)h"
    elif $s >= 3600 then "\($s / 3600 | floor)h\($s % 3600 / 60 | floor)m"
    elif $s >= 60 then "\($s / 60 | floor)m"
    else "\($s)s" end;

def tok:
  if . >= 1000000 then "\(. / 100000 | floor / 10)M"
  elif . >= 1000 then "\(. / 1000 | floor)k"
  else tostring end;

def pct: "\(round)%";
