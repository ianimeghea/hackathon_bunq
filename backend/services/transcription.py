"""
Audio transcription service — uses Amazon Nova Sonic on Bedrock
or falls back to Amazon Transcribe.

Expects AWS credentials via environment variables:
  AWS_DEFAULT_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
"""

import asyncio
import json
import os
import tempfile
import uuid

import boto3


def _get_bedrock_client():
    return boto3.client(
        "bedrock-runtime",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
    )


def _get_transcribe_client():
    return boto3.client(
        "transcribe",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
    )


def _get_s3_client():
    return boto3.client(
        "s3",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
    )


def _transcribe_with_nova_sonic(audio_bytes: bytes) -> str | None:
    """Try transcription via Nova Sonic converse API with audio input."""
    try:
        client = _get_bedrock_client()
        response = client.converse(
            modelId="amazon.nova-sonic-v1:0",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "audio": {
                            "format": "webm",
                            "source": {"bytes": audio_bytes},
                        }
                    },
                    {"text": "Transcribe this audio exactly. Return only the transcription, nothing else."},
                ],
            }],
            inferenceConfig={"maxTokens": 1024},
        )
        return response["output"]["message"]["content"][0]["text"]
    except Exception:
        return None


def _transcribe_with_bedrock_nova(audio_bytes: bytes) -> str | None:
    """Try transcription via Nova Pro/Lite models that support audio input."""
    for model_id in ["us.amazon.nova-pro-v1:0", "us.amazon.nova-lite-v1:0"]:
        try:
            client = _get_bedrock_client()
            response = client.converse(
                modelId=model_id,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "audio": {
                                "format": "webm",
                                "source": {"bytes": audio_bytes},
                            }
                        },
                        {"text": "Transcribe this audio exactly. Return only the transcription text, nothing else."},
                    ],
                }],
                inferenceConfig={"maxTokens": 1024},
            )
            return response["output"]["message"]["content"][0]["text"]
        except Exception:
            continue
    return None


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio using AWS Bedrock Nova models.

    Tries in order:
    1. Nova Sonic via Bedrock converse API
    2. Nova Pro/Lite via Bedrock converse API (audio input support)
    3. Raises error with instructions
    """
    loop = asyncio.get_event_loop()

    result = await loop.run_in_executor(None, _transcribe_with_nova_sonic, audio_bytes)
    if result:
        return result

    result = await loop.run_in_executor(None, _transcribe_with_bedrock_nova, audio_bytes)
    if result:
        return result

    raise RuntimeError(
        "Audio transcription failed via Bedrock. "
        "Use browser voice input (Web Speech API) instead — it transcribes locally in the browser."
    )
