# Prisma Runbook

This document serves as the standard operating procedure for interacting with the database via Prisma in the Yekis project.

All Prisma commands should be executed from within the `apps/backend` directory.

## 1. Local Development Workflow

When actively changing the database schema (`schema.prisma`), use the development migration command. This applies the changes to your local database, generates the TypeScript client, and creates a trackable `.sql` migration file.

```powershell
cd apps/backend
npx prisma migrate dev --name <descriptive-name-of-change>
```
*Example: `npx prisma migrate dev --name add_withholding_tax_table`*

## 2. Syncing the Client

If you pull changes from `main` that include new migrations (or if your VSCode types are out of sync), you need to regenerate the Prisma TypeScript client.

```powershell
cd apps/backend
npx prisma generate
```

## 3. Viewing Data (Prisma Studio)

Prisma includes a built-in GUI for viewing and editing records in your database.

```powershell
cd apps/backend
npx prisma studio
```
This will open a browser tab (usually at `http://localhost:5555`).

## 4. Troubleshooting & Resetting

If your local database gets corrupted, migrations fail to apply to the shadow database, or you just want to wipe the slate clean:

```powershell
cd apps/backend
npx prisma migrate reset
```
**Warning:** This will drop the database, recreate it, apply all migrations from scratch, and run the seed script (if configured). All local data will be lost.

## 5. Production / CI Deployment

When deploying to staging or production, **never** use `migrate dev`. Instead, use the deploy command, which safely applies pending migrations without prompting for resets or creating new migration files.

```bash
cd apps/backend
npx prisma migrate deploy
```

## 6. Formatting the Schema

To keep `schema.prisma` clean and consistently indented:

```powershell
cd apps/backend
npx prisma format
```

## Common Issues

- **Shadow Database Errors**: If `migrate dev` fails complaining about the "shadow database" or existing relations, it usually means your local database state drifted from the migration history. Running `npx prisma migrate reset` usually fixes this.
- **Missing Types after Pull**: If `tsc` throws errors about missing properties after you pulled new code, run `npx prisma generate` to update the generated `@prisma/client` in your `node_modules`.
