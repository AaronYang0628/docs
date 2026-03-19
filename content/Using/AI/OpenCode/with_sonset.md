+++
title = 'OpenCode + Sonset'
date = 2026-03-07T15:00:59+08:00
weight = 10
+++



{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
  ],
  "provider": {
    "zzz": {
      "name": "中转站",
      "npm": "@ai-sdk/openai-compatible",
      "models": {
        "claude-sonnet-4-5-20250929-thinking": {
          "name": "Claude Sonnet 4.5 Thinking",
          "reasoning": true,
          "limit": {
            "context": 200000,
            "output": 32000
          },
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "options": {
            "interleaved": {
              "field": "reasoning_content"
            }
          }
        }
      },
      "options": {
        "baseURL": "http://154.37.218.75:3000/v1",
        "apiKey": "sk-sssss"
      }
    }
  },
  "model": "zzz/claude-sonnet-4-5-20250929-thinking",
  "small_model": "zzz/claude-sonnet-4-5-20250929-thinking",
  "disabled_providers": []
}