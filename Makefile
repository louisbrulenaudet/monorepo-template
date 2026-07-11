include make/variables.mk
include make/turbo.mk

# Include specific command groups
include make/help.mk
include make/deps.mk
include make/quality.mk
include make/build.mk
include make/deploy.mk
include make/husky.mk
include make/skills.mk
include make/ai.mk

# Default target
.DEFAULT_GOAL := help

# Ensure these targets work even if files with the same names exist
.PHONY: help build test clean
