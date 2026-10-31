# Infra — guest photo album

Terraform for the private S3 bucket that stores the guest photo album, plus a
least-privilege IAM user the app uses to sign uploads/downloads.

## What it creates

- S3 bucket (private, public access blocked, SSE-S3 encryption, versioning)
- CORS for `giancat.com`, `www.giancat.com` and `localhost:3000`
- Lifecycle: aborts incomplete uploads after 1 day, purges old versions after 30 days
- IAM user `<bucket>-app` with Put/Get/Delete/List on this bucket only, plus an access key

## Usage

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # set region / bucket name
terraform init
terraform plan
terraform apply
```

Then copy the outputs into `.env.local` and the Vercel project env vars:

```bash
terraform output                                 # S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID
terraform output -raw s3_secret_access_key       # S3_SECRET_ACCESS_KEY
```

```
S3_REGION=...
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

> Vercel reserves `AWS_*` names like `AWS_ACCESS_KEY_ID`, hence the `S3_` prefix.

## State

State is local (`infra/terraform.tfstate`, git-ignored) and **contains the
access key secret** — don't commit or share it. To rotate the key:

```bash
terraform apply -replace=aws_iam_access_key.album_app
```
