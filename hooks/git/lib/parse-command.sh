#!/usr/bin/env sh
# Purpose: quote-aware parsing of a shell command string for the git guards.
# Target: sourced by hooks/git/guard-*.sh - not a hook entry point itself.
# Canonical location: hooks/git/lib/.
#
# Why this exists: the guards previously classified a command with unanchored
# substring matching over the WHOLE command line (`case $CMD in *git*add*`) and
# then scanned every whitespace token. That denied legitimate commands - a
# commit message mentioning `.env.local`, a path like `config.env.ts`, even a
# command that merely NAMED `guard-secret-commit.sh` (that path contains "git"
# then "commit"). This library replaces substring search with real parsing:
#
#   1. pc_segments  - split on UNQUOTED ; && || | & ( ) and newline.
#   2. pc_tokens    - tokenise one segment, honouring ' " and backslash.
#   3. pc_git_argv  - if the segment's command word is git, print the
#                     subcommand followed by its remaining arguments.
#   4. pc_operands  - keep only pathspec operands, dropping option VALUES
#                     (so `-m "…"` message text is never treated as a path).
#
# Contract: every function reads arguments and writes newline-separated results
# to stdout. Nothing here exits, denies, or writes to stderr - the calling
# guard owns the verdict. Callers must run with `set -f` so that untrusted
# command text is never glob-expanded.
#
# POSIX notes, verified against /bin/sh and dash on macOS:
#   - `set --` inside a function is function-local, so positional parameters
#     are a safe per-segment argument vector (no arrays in POSIX sh).
#   - awk does the character-level quote tracking; doing it in sh would need
#     one fork per character.
#   - awk programs below use sprintf("%c",39)/(34) for ' and " so the whole
#     program can live inside a single-quoted sh string.

# A newline held in a variable. Callers use `IFS=$PC_NL` instead of writing a
# literal newline inside quotes: macOS /bin/sh (bash 3.2) mis-parses that form
# when it appears inside a command substitution.
PC_NL=$(printf '\nx')
PC_NL=${PC_NL%x}

# --- pass 1: segmentation -----------------------------------------------------
# Splits a command into independently-judged segments. Quoted separators stay
# inside their segment, so `echo "a && b"` is ONE segment, not three.
# NOTE: input lines are rejoined with a NEWLINE, not a space. A newline is a
# shell command separator, so collapsing it would merge independent commands into
# one segment and let `git status<newline>git reset --hard` read as a mere
# `git status` with trailing operands. Inside quotes a newline is part of an
# argument, so there it is folded to a space to preserve one-segment-per-line
# framing on output.
PC_AWK_SEGMENTS='
BEGIN { SQ = sprintf("%c", 39); DQ = sprintf("%c", 34) }
{ buf = (NR > 1) ? buf "\n" $0 : $0 }
END {
  n = length(buf); q = ""; seg = ""
  for (i = 1; i <= n; i++) {
    c = substr(buf, i, 1)
    if (q != "") {
      if (c == "\n") c = " "
      seg = seg c
      if (q == SQ && c == SQ) { q = "" }
      else if (q == DQ && c == DQ) { q = "" }
      else if (q == DQ && c == "\\") { i++; if (i <= n) seg = seg substr(buf, i, 1) }
      continue
    }
    if (c == SQ || c == DQ) { q = c; seg = seg c; continue }
    if (c == "\\") {
      i++
      if (i <= n) {
        d = substr(buf, i, 1)
        # backslash-newline is a line continuation, not an argument character.
        if (d != "\n") seg = seg "\\" d
      }
      continue
    }
    if (c == ";" || c == "|" || c == "&" || c == "(" || c == ")" || c == "\n") { print seg; seg = ""; continue }
    seg = seg c
  }
  print seg
}
'

# --- pass 2: tokenisation -----------------------------------------------------
# Turns one segment into tokens with quotes resolved, one token per line, so
# `-m "document .env.local setup"` yields ONE token for the message.
PC_AWK_TOKENS='
BEGIN { SQ = sprintf("%c", 39); DQ = sprintf("%c", 34) }
{ buf = (NR > 1) ? buf " " $0 : $0 }
END {
  n = length(buf); q = ""; tok = ""; have = 0
  for (i = 1; i <= n; i++) {
    c = substr(buf, i, 1)
    if (q == "") {
      if (c == " " || c == "\t") { if (have) { print tok; tok = ""; have = 0 }; continue }
      if (c == SQ || c == DQ) { q = c; have = 1; continue }
      if (c == "\\") { i++; if (i <= n) { tok = tok substr(buf, i, 1); have = 1 }; continue }
      tok = tok c; have = 1; continue
    }
    if (q == SQ) {
      if (c == SQ) { q = ""; continue }
      tok = tok c; continue
    }
    if (c == DQ) { q = ""; continue }
    if (c == "\\") { i++; if (i <= n) tok = tok substr(buf, i, 1); continue }
    tok = tok c
  }
  if (have) print tok
}
'

pc_segments() {
  printf '%s\n' "$1" | awk "$PC_AWK_SEGMENTS"
}

pc_tokens() {
  printf '%s\n' "$1" | awk "$PC_AWK_TOKENS"
}

# pc_git_argv <segment>
# Prints the git subcommand on line 1 and its remaining arguments on the
# following lines. Prints NOTHING when the segment is not a git invocation,
# which is what makes `echo "git add .env"` and `./guard-secret-commit.sh`
# harmless.
pc_git_argv() {
  # IFS must be newline ONLY here: pc_tokens emits one token per line and a
  # token may legitimately contain spaces (a quoted commit message). Splitting
  # on the default IFS would undo the tokenisation this library exists to do.
  pc_oldifs=$IFS
  IFS=$PC_NL
  set -- $(pc_tokens "$1")
  IFS=$pc_oldifs
  [ $# -gt 0 ] || return 0

  # Step over leading VAR=value assignments and command wrappers.
  while [ $# -gt 0 ]; do
    case ${1##*/} in
      sudo | doas | env | command | nice | ionice | nohup | time | stdbuf | setsid | xargs)
        pc_w=${1##*/}
        shift
        # A wrapper carries its OWN options, and some of those take a separate
        # value. Skipping only the flag would leave the value as the command
        # word, so `sudo -u root git push --force` would not be seen as git.
        # The table is keyed by wrapper so that boolean flags such as `env -i`
        # do not wrongly swallow the following word.
        while [ $# -gt 0 ]; do
          case "$pc_w=$1" in
            sudo=-u | sudo=-g | sudo=-U | sudo=-p | sudo=-C | sudo=-r | sudo=-t \
              | env=-u | env=-C | env=-S | nice=-n \
              | ionice=-c | ionice=-n | ionice=-p \
              | stdbuf=-i | stdbuf=-o | stdbuf=-e)
              shift
              [ $# -gt 0 ] && shift
              continue
              ;;
          esac
          case $1 in
            --) shift; break ;;
            -*) shift ;;
            *=*)
              case ${1%%=*} in
                '' | *[!A-Za-z0-9_]*) break ;;
                *) shift ;;
              esac
              ;;
            *) break ;;
          esac
        done
        ;;
      *)
        case $1 in
          *=*)
            # Only a real NAME=value assignment; `--message=x` must not qualify.
            case ${1%%=*} in
              '' | *[!A-Za-z0-9_]*) break ;;
              *) shift ;;
            esac
            ;;
          *) break ;;
        esac
        ;;
    esac
  done
  [ $# -gt 0 ] || return 0

  # The command word itself must be git - bare, or any path ending in /git.
  case $1 in
    git | */git) shift ;;
    *) return 0 ;;
  esac

  # Step over git's own global options so the subcommand is found correctly.
  while [ $# -gt 0 ]; do
    case $1 in
      -C | -c | --git-dir | --work-tree | --namespace | --exec-path | --config-env)
        shift
        [ $# -gt 0 ] && shift
        ;;
      --git-dir=* | --work-tree=* | --namespace=* | --exec-path=* | --config-env=*) shift ;;
      --no-pager | --paginate | -p | -P | --bare | --literal-pathspecs | --no-replace-objects | --no-optional-locks) shift ;;
      -*) shift ;;
      *) break ;;
    esac
  done
  [ $# -gt 0 ] || return 0

  printf '%s\n' "$@"
}

# pc_operands <subcommand> [args...]
# Prints only the pathspec operands. Option values that can never be a path -
# above all a commit message - are dropped, so `git commit -m "fix .env.local"`
# yields no operands at all.
pc_operands() {
  shift || return 0
  pc_eoo=0
  while [ $# -gt 0 ]; do
    if [ "$pc_eoo" -eq 1 ]; then
      printf '%s\n' "$1"
      shift
      continue
    fi
    case $1 in
      --) pc_eoo=1; shift ;;
      # Redirections. A redirect TARGET is never a pathspec, so dropping it stops
      # `git add foo > .env` from reading as an attempt to stage .env. Detached
      # operators consume the following word; attached ones (`>/dev/null`) do not.
      '>' | '>>' | '<' | '<<' | '<<<' | '>&' | '<&' | '&>' | '&>>' \
        | [0-9]'>' | [0-9]'>>' | [0-9]'>&' | [0-9]'<')
        shift
        [ $# -gt 0 ] && shift
        ;;
      '>'* | '<'* | '&>'* | [0-9]'>'* | [0-9]'<'*) shift ;;
      # Options that genuinely REQUIRE a separate value, none of which can be a
      # pathspec. Deliberately excludes optional-argument flags such as -S and
      # the boolean -u/--update: listing those would let `git add -u .env` eat
      # its own operand and silently pass.
      -m | --message | -F | --file | -C | --reuse-message | -c | --reedit-message \
        | --author | --date | -t | --template | --fixup | --squash | --pathspec-from-file)
        shift
        [ $# -gt 0 ] && shift
        ;;
      # Attached forms: --message=…, -m"…" - the value rides inside the token.
      --*=* | -[mFCct]?*) shift ;;
      # Bundled short group whose LAST letter takes a value, e.g. `-am "msg"`:
      # the value is the following token. Long options cannot match, because
      # their second character is `-`, which is outside [A-Za-z].
      -[A-Za-z]*[mFCct])
        shift
        [ $# -gt 0 ] && shift
        ;;
      -*) shift ;;
      *) printf '%s\n' "$1"; shift ;;
    esac
  done
  # Load-bearing: a trailing `[ $# -gt 0 ] && shift` exits 1, and callers assign
  # this bare (`ops=$(pc_operands …)`), so `set -e` turns it into a guard fault.
  return 0
}

# pc_has_flag <needle> [args...]
# True when the argument list contains <needle> as a long option, or - for a
# single-letter needle - inside a bundled short group such as `-fd`.
pc_has_flag() {
  pc_needle=$1
  shift
  while [ $# -gt 0 ]; do
    case $1 in
      --) return 1 ;;
      "$pc_needle") return 0 ;;
    esac
    # Bundled short flags: -fd contains f and d. Long options are exempt.
    case $pc_needle in
      -?)
        case $1 in
          --*) ;;
          -*) case ${1#-} in *"${pc_needle#-}"*) return 0 ;; esac ;;
        esac
        ;;
    esac
    shift
  done
  return 1
}
