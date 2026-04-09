# Include shared make fragments from repo root (relative to this Makefile)
include ../../make/variables.mk
PROJECT_NAME := dtos-common
include ../../make/help.mk

# App-specific targets
include make/dev.mk

# Default target
.DEFAULT_GOAL := help

# Ensure these targets work even if files with the same names exist
.PHONY: help build test clean
