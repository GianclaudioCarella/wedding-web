# Private bucket for the guest photo album.
# The app never exposes it publicly: uploads go through presigned POSTs and
# reads through short-lived presigned GET URLs.

resource "aws_s3_bucket" "album" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "album" {
  bucket = aws_s3_bucket.album.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "album" {
  bucket = aws_s3_bucket.album.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "album" {
  bucket = aws_s3_bucket.album.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "album" {
  bucket = aws_s3_bucket.album.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_cors_configuration" "album" {
  bucket = aws_s3_bucket.album.id

  cors_rule {
    allowed_origins = var.allowed_origins
    allowed_methods = ["GET", "POST"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "album" {
  bucket = aws_s3_bucket.album.id

  # Clean up uploads that started but never finished (e.g. guest closed the tab).
  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  # Purge old versions of deleted/overwritten photos after a grace period.
  rule {
    id     = "expire-noncurrent-versions"
    status = var.enable_versioning ? "Enabled" : "Disabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.album]
}
