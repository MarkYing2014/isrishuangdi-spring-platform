# Quality Management Data Storage

The Quality Management module stores uploaded datasets and analysis results on the server filesystem. By default, it uses the system's temporary directory (`os.tmpdir()`), which is **not persistent** across server restarts or in serverless environments.

## Self-Hosted Persistent Storage

For production self-hosted deployments, configure a persistent directory:

### 1. Create a persistent directory

```bash
sudo mkdir -p /var/data/isri-quality
sudo chown <app-user>:<app-group> /var/data/isri-quality
```

Replace `<app-user>` and `<app-group>` with the user/group running your Next.js application.

### 2. Set the environment variable

Add to your `.env.local`, `.env.production`, or deployment configuration:

```bash
QUALITY_DATA_DIR=/var/data/isri-quality
```

### 3. Verify permissions

The application user must have **read and write** permissions on this directory.

---

## Serverless Deployments (Vercel, Netlify, AWS Lambda)

Serverless platforms do **not** provide persistent filesystem storage. The `/tmp` directory is:

- **Ephemeral**: Data may be lost between requests
- **Instance-scoped**: Different requests may hit different instances

For serverless deployments, consider:

1. **External object storage** (S3, R2, GCS)
2. **Database storage** (PostgreSQL, MongoDB)
3. **Key-value store** (Redis, Upstash)

> **Note**: The current implementation uses local filesystem storage. For serverless production use, a persistent storage backend would need to be implemented.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QUALITY_DATA_DIR` | Path to persistent storage directory | `os.tmpdir()/isri-quality` |

---

## Troubleshooting

### Error: `ENOENT: no such file or directory, mkdir '/var/task/.tmp/quality'`

This occurs when running on serverless (e.g., Vercel) where `process.cwd()` points to a read-only directory. The fix (already applied) uses `os.tmpdir()` instead.

### Error: `Dataset not found`

This typically means:

1. **Serverless environment**: The dataset was stored on a different instance or the instance was recycled
2. **Server restart**: Data in `/tmp` was cleared
3. **Missing `QUALITY_DATA_DIR`**: Configure a persistent directory for self-hosted deployments

**Solution**: Set `QUALITY_DATA_DIR` to a persistent, writable path.
