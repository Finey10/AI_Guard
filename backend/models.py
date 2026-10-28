"""
models.py — Data persistence layer for ReleaseGuard.

Design choice (MVP)
-------------------
This project uses JSON flat-files for all data storage rather than SQLite or
an ORM.  Rationale:
- Zero database setup/migration complexity for a hackathon demo
- Data is human-readable and easily version-controlled
- The JSON fixtures serve as both seed data and the "database"

A production system should replace this with SQLAlchemy + SQLite/Postgres,
using Alembic for migrations.  The data_service.py module is the only layer
that reads/writes these files, so the swap would be isolated.

This file is kept for architectural completeness and documents the intended
schema for a future database migration.
"""

# Intended schema (reference only — not enforced at runtime for the MVP):
#
# Table: services
#   service_name      TEXT PRIMARY KEY
#   slo_target        REAL NOT NULL
#   owner_team        TEXT NOT NULL
#   criticality       TEXT NOT NULL   -- "high" | "medium" | "low"
#   description       TEXT
#
# Table: release_history
#   release_id            TEXT PRIMARY KEY
#   service_name          TEXT NOT NULL  REFERENCES services(service_name)
#   timestamp             TEXT NOT NULL  -- ISO 8601 UTC
#   change_size           TEXT NOT NULL  -- "small" | "medium" | "large"
#   files_changed         INTEGER
#   author_tenure_months  INTEGER
#   time_of_day           TEXT
#   caused_incident       INTEGER        -- 0 | 1
#   incident_severity     TEXT           -- nullable
#   observed_availability REAL
#   error_rate_percent    REAL
#   notes                 TEXT
#
# Table: risk_assessments  (future — persist POST /api/analyze-release results)
#   assessment_id         TEXT PRIMARY KEY
#   service_name          TEXT NOT NULL
#   created_at            TEXT NOT NULL  -- ISO 8601 UTC
#   risk_score            REAL
#   recommendation        TEXT
#   payload_json          TEXT           -- full request+response as JSON blob
