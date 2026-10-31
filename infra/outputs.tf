output "s3_region" {
  value = var.region
}

output "s3_bucket" {
  value = aws_s3_bucket.album.bucket
}

output "s3_access_key_id" {
  value = aws_iam_access_key.album_app.id
}

output "s3_secret_access_key" {
  value     = aws_iam_access_key.album_app.secret
  sensitive = true
}
