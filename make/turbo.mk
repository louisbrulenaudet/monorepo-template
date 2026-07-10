# make/turbo.mk — shared turbo flag computation for root targets
#
# Usage:
#   make dev SCOPE=worker-api
#   make ci AFFECTED=1
#   make build FILTER=...front-app...

TURBO ?= pnpm turbo run
TURBO_FILTER :=
ifdef SCOPE
  TURBO_FILTER += --filter=$(SCOPE)
endif
ifdef FILTER
  TURBO_FILTER += --filter=$(FILTER)
endif
ifdef AFFECTED
  TURBO_FILTER += --affected
endif
