import uuid
from pathlib import Path
from typing import Optional

import boto3
from botocore.config import Config
from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool

from app.core.config import settings

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_s3_client():
    session = boto3.session.Session(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION,
    )
    config = Config(signature_version="s3v4")
    return session.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        config=config,
    )


def get_s3_key(file_name: str) -> str:
    unique_prefix = uuid.uuid4().hex
    return f"uploads/{unique_prefix}-{file_name}"


def get_s3_url(key: str) -> str:
    bucket = settings.AWS_S3_BUCKET
    if not bucket:
        raise ValueError("AWS_S3_BUCKET must be configured to build S3 URLs")
    if settings.AWS_S3_ENDPOINT_URL:
        return f"{settings.AWS_S3_ENDPOINT_URL}/{bucket}/{key}"
    return f"https://{bucket}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}"


def save_file_locally(file_path: Path, contents: bytes) -> str:
    file_path.write_bytes(contents)
    return str(file_path)


def upload_file_to_s3(key: str, contents: bytes) -> str:
    client = get_s3_client()
    client.put_object(Bucket=settings.AWS_S3_BUCKET, Key=key, Body=contents)
    return get_s3_url(key)


async def save_upload_file(upload_file: UploadFile) -> str:
    contents = await upload_file.read()
    file_name = upload_file.filename.replace(" ", "_")
    if settings.USE_S3 and settings.AWS_S3_BUCKET:
        key = get_s3_key(file_name)
        return await run_in_threadpool(upload_file_to_s3, key, contents)

    unique_name = f"{uuid.uuid4().hex}-{file_name}"
    local_path = UPLOAD_DIR / unique_name
    return await run_in_threadpool(save_file_locally, local_path, contents)


def is_s3_enabled() -> bool:
    return bool(settings.USE_S3 and settings.AWS_S3_BUCKET)
