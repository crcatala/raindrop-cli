# Error Style Guide

## Goals
- Make errors actionable and easy to understand.
- Prefer user guidance over internal details.
- Keep messages short and consistent.

## Structure
- Problem sentence, then actionable next step.
- 1-2 sentences total.
- Put the most actionable info at the end.

## Tone and formatting
- Sentence case.
- No "Error:" prefix.
- Quote user input when echoing it (e.g., "abc").
- Avoid internal jargon and stack traces in normal output.

## Debug details
- Only show extra details when `--debug` is enabled.
- Keep debug output separate from the user-facing message.

## Exit codes
- 2 for usage and validation errors.
- 1 for runtime or API errors.

## Examples
- Invalid collection ID: "abc". Use `rd collections list` to see available IDs.
- Can't connect to Raindrop API. Check your internet connection or try again later.
- Rate limited by Raindrop API. Wait 60 seconds before retrying.
