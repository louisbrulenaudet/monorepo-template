---
paths:
  - "apps/**/src/db/**"
---

# Drizzle ORM Naming

Drizzle schema, migrations, and query helpers live under `apps/<app>/src/db/` in the **Worker that owns that database** — **never** a shared `packages/db-*` package.

**One owner per DB binding.** Do not attach the same D1/Hyperdrive/etc. binding to multiple apps (that splits migrations and schema ownership). Other apps read or write that data only via **service-binding RPC** (or a queue) to the owning Worker.

## Database naming

| Kind | Convention | Examples |
|------|-----------|---------|
| Tables | `snake_case`, **plural** | `accounts`, `hostnames` |
| Columns | `snake_case`, **singular** | `id`, `account_id`, `created_at` |
| Foreign keys | `snake_case`, `{table_singular}_id` | `account_id`, `hostname_id` |

```typescript
// ✅ Correct
const accountsTable = pgTable("accounts", {
  id: text("id").primaryKey(),
  account_id: text("account_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// ❌ Incorrect - singular table, plural column
const accountTable = pgTable("account", {
  hostname_ids: serial("hostname_ids"),
});
```
