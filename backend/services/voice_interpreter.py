import anthropic
import json
import os
import re

client = anthropic.AnthropicBedrock(
    aws_region=os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "eu-central-1")),
)

SYSTEM = """You are a voice assistant for a receipt splitting app. The user is reviewing a list of receipt items, each categorized as "shared" (household) or "personal" (individual).

The user will speak a command to change item categories. Your job is to interpret what they want and return the updated items list.

Examples of commands the user might say:
- "Make the shampoo personal"
- "The beer and chips should be personal"
- "Actually the rice is shared"
- "Move everything with chocolate to personal"
- "Make all the drinks personal"
- "The cleaning supplies should be shared"
- "Split the milk as shared"
- "Everything is fine" (no changes)

Return ONLY valid JSON with this format:
{
  "understood": true,
  "summary": "Short description of what you changed",
  "items": [ ...the full updated items list with categories changed as requested... ]
}

If you cannot understand the command or it doesn't relate to changing categories:
{
  "understood": false,
  "summary": "I didn't understand that. Try saying something like 'make the shampoo personal' or 'the beer should be personal'.",
  "items": [ ...return items unchanged... ]
}

Rules:
- Match items by name loosely — "shampoo" should match "Head & Shoulders Shampoo"
- You can match multiple items at once — "all the drinks" should match all beverage items
- Only change the "category" field — never modify name, price, or confidence
- Return ALL items, not just the changed ones"""


def interpret_voice_command(transcript: str, items: list) -> dict:
    items_json = json.dumps(items, indent=2)

    response = client.messages.create(
        model="eu.anthropic.claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"Current items:\n{items_json}\n\nUser said: \"{transcript}\"",
            }
        ],
    )

    text = response.content[0].text
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group())
    return json.loads(text)
