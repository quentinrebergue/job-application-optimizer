# Restoring the database from a backup

What exists, how to check that a backup can be restored (the drill), and what to do if the database is lost.

## What exists

| | |
|---|---|
| Backup | `postgres-backup` CronJob (`k8s/postgres/backup-cronjob.yaml`): `pg_dump | gzip` every day at 03:00 |
| Where, first copy | the volume `pgbackup` (2 Gi) **in the same cluster** as the database: the fast way back |
| Where, second copy | the OVH Object Storage bucket `fastresume-db-backups` at Roubaix (the cluster is at Strasbourg), **encrypted with `age`** before it leaves the pod |
| Kept | 7 days, by age, in both places: `job_optimizer-YYYYMMDD-HHMMSS.sql.gz` (and `.sql.gz.age` in the bucket) |
| Not covered | what was written since the last night (up to 24 hours), and a lost `age` private key (see "Gaps") |

A backup nobody has restored is a hope. The drill below is the proof: do it before opening to real users, then after any
change to the backup, and every few months.

## The drill: restore the latest backup into a scratch database

It reads the backup volume, creates the database `restore_drill`, loads the latest file into it, counts the rows of every
table against production, times the restore, and drops `restore_drill`. The production database is only read. It takes a
few seconds to a few minutes, with the memory of one small pod.

1. Start it (the manifest is not in `kustomization.yaml`: Argo CD never runs it):
   ```bash
   kubectl apply -f k8s/postgres/restore-drill-job.yaml
   ```
2. Follow it:
   ```bash
   kubectl logs -n job-optimizer -f job/restore-drill
   ```
3. Read the result:
   - `taken:` is the age of the backup: under 24 hours when the CronJob works.
   - `restored in N s` is the time to restore with this much data. Write it down: it is the minimum of an outage.
   - The table of rows: production now / restored. The restored count is lower or equal to the production one by what was
     written since 03:00. A table at 0 in the restore and not in production, or a table listed as missing, is a failure.
4. Clean up (the Job also removes itself after an hour):
   ```bash
   kubectl delete job restore-drill -n job-optimizer
   ```

If the drill fails, the logs say where: `ON_ERROR_STOP` stops at the first SQL error, which names the statement.

### Results

| Date | Backup | Size | Restore | Rows | By |
|---|---|---|---|---|---|
| | | | | | |

## If the database is lost: restoring for real

Not exercised yet: the first real restore must not be the first time anyone reads it. The steps use the drill's pieces.

1. **Stop the writers**, so nothing is written to the old and the new database at once:
   ```bash
   kubectl scale deployment app -n job-optimizer --replicas=0
   ```
2. **Take one more dump of what is left**, even if the database looks broken (it may still hold more than the last backup):
   ```bash
   kubectl create job --from=cronjob/postgres-backup manual-before-restore -n job-optimizer
   ```
3. **Restore into a new database**, not over the old one: copy `k8s/postgres/restore-drill-job.yaml`, change
   `restore_drill` to `job_optimizer_restored` and remove its last `DROP DATABASE`, apply it, read the row counts.
4. **Swap the names**, once the counts are right:
   ```bash
   kubectl exec -n job-optimizer postgres-0 -- psql -U app -d postgres \
     -c "ALTER DATABASE job_optimizer RENAME TO job_optimizer_old" \
     -c "ALTER DATABASE job_optimizer_restored RENAME TO job_optimizer"
   ```
   (the rename fails while someone is connected: with the app scaled to 0, only a leftover session can be in the way;
   `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'job_optimizer'` ends it.)
5. **Start the app again** and check `https://fastresume.tech/api/healthz`:
   ```bash
   kubectl scale deployment app -n job-optimizer --replicas=1
   ```
6. Keep `job_optimizer_old` until the restored data is confirmed, then drop it.

Everything written since the last backup is lost: say so to the people concerned.

## The copy off the cluster

### Put it in service (once)

Do it **before** Argo CD syncs the CronJob: it reads a Secret, and without it the pod does not start, so no backup is made.

1. **The bucket and its user** are made in the OVH interface (Public Cloud > Object Storage): S3 API, 1-AZ, Roubaix, versioning
   and Object Lock off (they would keep deleted data past the 7 days), and a user of its own with the role "Object Storage
   operator". The secret key is shown once: keep it in your password manager, never in the repository or a message.
2. **A pair of `age` keys.** The public key goes to the cluster, the private key stays with you and **nowhere in the cluster**: without
   it a backup of the bucket is unreadable, for anyone, you included. Keep the private key in the password manager and a copy
   on paper or a USB stick.
   ```bash
   brew install age rclone
   age-keygen -o ~/fastresume-backup-age-key.txt
   ```
   It prints `Public key: age1...`: that line is the public key, which is not secret.
3. **The Secret**, with the two S3 keys and the public key (write the keys in the command only on your own terminal):
   ```bash
   kubectl create secret generic backup-offsite -n job-optimizer \
     --from-literal=S3_ACCESS_KEY_ID='<access key>' \
     --from-literal=S3_SECRET_ACCESS_KEY='<secret key>' \
     --from-literal=AGE_PUBLIC_KEY='age1...'
   ```
4. **Sync** the app in Argo CD, then run the job once by hand instead of waiting for 03:00:
   ```bash
   kubectl create job --from=cronjob/postgres-backup backup-offsite-test -n job-optimizer
   kubectl logs -n job-optimizer -f job/backup-offsite-test
   ```
   It ends with `off-site copy done: job_optimizer-....sql.gz.age`. Delete the test job afterwards.

### Check that the copy can be read (do it once, then with the drill)

A backup is only worth the key that opens it. From your computer, with the three values of the Secret in your shell:

```bash
export RCLONE_S3_PROVIDER=Other RCLONE_S3_ENDPOINT=https://s3.rbx.io.cloud.ovh.net RCLONE_S3_REGION=rbx
export RCLONE_S3_ACCESS_KEY_ID='<access key>' RCLONE_S3_SECRET_ACCESS_KEY='<secret key>'
rclone lsf :s3:fastresume-db-backups
rclone copyto :s3:fastresume-db-backups/<a file of the list> ./backup.sql.gz.age
age -d -i ~/fastresume-backup-age-key.txt backup.sql.gz.age | gunzip | head -n 20
```

You must see the start of a PostgreSQL dump (`-- PostgreSQL database dump`). Delete `backup.sql.gz.age` afterwards: it holds the
users' data.

### Restoring from the copy

Same steps as "restoring for real" below, except that the file comes from the bucket: download it as above, then
`age -d -i <private key> file.age | gunzip | psql ...` into the new database (through
`kubectl port-forward -n job-optimizer svc/postgres 5432`), instead of the Job reading the volume.

## After any restore: the accounts that were deleted come back

A backup holds the accounts as they were that night. Everyone who **deleted their account after the backup date** is in the
restored database again, with their library and offers. They asked for erasure: it must be done again **before the site is opened**.

1. Find who deleted their account since the backup date. For now the only record is the "account deleted" notice mails
   (`noticeAccountDeleted`) in the mail provider's log, and the support messages. **There is no durable list outside the
   database yet**: that is a gap (below).
2. Delete each of those accounts from the restored database (the cascade removes everything that points at the user):
   ```bash
   kubectl exec -n job-optimizer postgres-0 -- psql -U app -d job_optimizer -c "DELETE FROM users WHERE email = '<address>'"
   ```
3. Tell the person only if they ask: nothing was published, the site was down.

## Gaps (what this runbook does not make true)

- **No durable list of the accounts deleted.** After a restore the step above depends on memory and on mail logs. A log that
  survives a restore (the id of the account and the date, never the email, written outside the database, in the bucket for
  instance) is to be done.
- **A lost `age` private key makes the copy off the cluster useless.** The first copy (the volume) is not encrypted by `age`:
  it relies on the volume of the cluster. Keep the key in two places.
- **Up to 24 hours of data can be lost**: one dump a night.
- **Both copies are in the same OVH account.** A suspended account takes the cluster and the bucket together; a second
  copy at another provider is the next step if the site grows.
