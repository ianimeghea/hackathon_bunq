import anthropic
import base64
import json
import os
import re

from .preference_store import preference_store

client = anthropic.AnthropicBedrock(
    aws_region=os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "eu-central-1")),
)

SYSTEM_PROMPT = """You are an expert receipt analyzer for a household expense splitting app. Your job is to:
1. Extract ALL line items from the receipt image with their exact prices
2. Categorize each item as EITHER "shared" (household expense) or "personal" (individual expense)

You MUST use BOTH categories. Think carefully about each item:

SHARED — items the whole household uses together:
- Staple groceries: bread, milk, eggs, rice, pasta, butter, cooking oil, flour, sugar, salt
- Fresh produce: fruits, vegetables (when bought for meals)
- Cleaning: dish soap, laundry detergent, surface cleaner, sponges
- Household: toilet paper, paper towels, trash bags, light bulbs
- Cooking ingredients: spices, condiments, sauces, canned goods
- Shared beverages: water, juice, coffee, tea

PERSONAL — items that serve one specific person:
- Snacks & treats: candy, chocolate bars, chips, cookies, ice cream, gum
- Personal drinks: energy drinks, specific soda brands, alcohol, beer, wine
- Personal care: deodorant, shampoo, conditioner, razors, cosmetics, toothbrush
- Health: vitamins, supplements, medications
- Individual items: magazines, specific brand preferences that only one person uses
- Ready meals & individual portions: single-serve meals, protein bars

Be decisive. Most receipts should have a MIX of both shared and personal items. Snacks, treats, alcohol, and personal care are almost always "personal".

{preferences}

Return ONLY valid JSON with no other text, in this exact format:
{{
  "store_name": "Store Name",
  "date": "YYYY-MM-DD or empty string if not visible",
  "currency": "€ or $ or £ etc — use the symbol shown on the receipt",
  "items": [
    {{"name": "Whole Milk", "price": 1.29, "category": "shared", "confidence": 0.95}},
    {{"name": "Energy Drink", "price": 2.49, "category": "personal", "confidence": 0.9}},
    {{"name": "Shampoo", "price": 4.99, "category": "personal", "confidence": 0.95}}
  ],
  "subtotal": 45.67,
  "tax": 3.21,
  "total": 48.88
}}

Rules:
- Extract every single line item visible on the receipt
- Prices must be numbers, not strings
- If tax or subtotal is not visible, set them to null
- confidence should be between 0 and 1, reflecting how sure you are about the categorization
- Do NOT include total/subtotal/tax as line items
- If the receipt has discounts, include them as negative-price items"""


def extract_receipt(image_bytes: bytes, media_type: str) -> dict:
    preferences = preference_store.get_rules_prompt()
    system = SYSTEM_PROMPT.format(
        preferences=preferences if preferences else "No user preferences yet."
    )

    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    response = client.messages.create(
        model="eu.anthropic.claude-opus-4-6-v1",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Extract all items from this receipt and categorize each as shared or personal.",
                    },
                ],
            }
        ],
        system=system,
    )

    text = response.content[0].text
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group())
    return json.loads(text)
