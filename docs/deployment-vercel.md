# Vercel Deployment

## One-shot deploy

1. Import this repository in Vercel.
2. Keep default settings (static deploy).
3. Deploy.

## Full runnable services (local)

Use local runtime for backend + UI together:

```bash
npm start
```

Then open `http://localhost:4173/admin/` and run the full deterministic pipeline.

## Routes

- `/`
- `/login/`
- `/admin/`
- `/user/`
- `/dev/`

Configured in `vercel.json` for clean URLs.
