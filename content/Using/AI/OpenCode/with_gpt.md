+++
title = 'OpenCode + GPT'
date = 2026-03-07T15:00:59+08:00
weight = 10
+++

1. create default configurtion file `~/.config/opencode/opencode.json`
```shell
vim ~/.config/opencode/opencode.json
```

### Copt Paster This Opencode Config
```json
{
  "provider": {
    "openai": {
      "options": {
        "baseURL": "https://v2.qixuw.com/v1",
        "apiKey": "sk-sss"
      },
      "models": {
        "gpt-5-codex": {
          "name": "GPT-5 Codex",
          "limit": {
            "context": 400000,
            "output": 128000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {}
          }
        },
        "gpt-5.1-codex": {
          "name": "GPT-5.1 Codex",
          "limit": {
            "context": 400000,
            "output": 128000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {}
          }
        },
        "gpt-5.1-codex-max": {
          "name": "GPT-5.1 Codex Max",
          "limit": {
            "context": 400000,
            "output": 128000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {}
          }
        },
        "gpt-5.1-codex-mini": {
          "name": "GPT-5.1 Codex Mini",
          "limit": {
            "context": 400000,
            "output": 128000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {}
          }
        },
        "gpt-5.2": {
          "name": "GPT-5.2",
          "limit": {
            "context": 400000,
            "output": 128000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {},
            "xhigh": {}
          }
        },
        "gpt-5.4": {
          "name": "GPT-5.4",
          "limit": {
            "context": 1050000,
            "output": 128000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {},
            "xhigh": {}
          }
        },
        "gpt-5.3-codex-spark": {
          "name": "GPT-5.3 Codex Spark",
          "limit": {
            "context": 128000,
            "output": 32000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {},
            "xhigh": {}
          }
        },
        "gpt-5.3-codex": {
          "name": "GPT-5.3 Codex",
          "limit": {
            "context": 400000,
            "output": 128000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {},
            "xhigh": {}
          }
        },
        "gpt-5.2-codex": {
          "name": "GPT-5.2 Codex",
          "limit": {
            "context": 400000,
            "output": 128000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {},
            "xhigh": {}
          }
        },
        "codex-mini-latest": {
          "name": "Codex Mini",
          "limit": {
            "context": 200000,
            "output": 100000
          },
          "options": {
            "store": false
          },
          "variants": {
            "low": {},
            "medium": {},
            "high": {}
          }
        }
      }
    }
  },
  "agent": {
    "build": {
      "options": {
        "store": false
      }
    },
    "plan": {
      "options": {
        "store": false
      }
    }
  },
  "$schema": "https://opencode.ai/config.json"
}
```

### K8s Manifest
```shell
kubectl -n opencode apply -f - <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: opencode-config
  namespace: opencode
data:
  opencode.json: |
    {
    "provider": {
        "openai": {
        "options": {
            "baseURL": "https://v2.qixuw.com/v1",
            "apiKey": "sk-sdf"
        },
        "models": {
            "gpt-5-codex": {
            "name": "GPT-5 Codex",
            "limit": {
                "context": 400000,
                "output": 128000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {}
            }
            },
            "gpt-5.1-codex": {
            "name": "GPT-5.1 Codex",
            "limit": {
                "context": 400000,
                "output": 128000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {}
            }
            },
            "gpt-5.1-codex-max": {
            "name": "GPT-5.1 Codex Max",
            "limit": {
                "context": 400000,
                "output": 128000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {}
            }
            },
            "gpt-5.1-codex-mini": {
            "name": "GPT-5.1 Codex Mini",
            "limit": {
                "context": 400000,
                "output": 128000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {}
            }
            },
            "gpt-5.2": {
            "name": "GPT-5.2",
            "limit": {
                "context": 400000,
                "output": 128000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {},
                "xhigh": {}
            }
            },
            "gpt-5.4": {
            "name": "GPT-5.4",
            "limit": {
                "context": 1050000,
                "output": 128000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {},
                "xhigh": {}
            }
            },
            "gpt-5.3-codex-spark": {
            "name": "GPT-5.3 Codex Spark",
            "limit": {
                "context": 128000,
                "output": 32000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {},
                "xhigh": {}
            }
            },
            "gpt-5.3-codex": {
            "name": "GPT-5.3 Codex",
            "limit": {
                "context": 400000,
                "output": 128000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {},
                "xhigh": {}
            }
            },
            "gpt-5.2-codex": {
            "name": "GPT-5.2 Codex",
            "limit": {
                "context": 400000,
                "output": 128000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {},
                "xhigh": {}
            }
            },
            "codex-mini-latest": {
            "name": "Codex Mini",
            "limit": {
                "context": 200000,
                "output": 100000
            },
            "options": {
                "store": false
            },
            "variants": {
                "low": {},
                "medium": {},
                "high": {}
            }
            }
        }
        }
    },
    "agent": {
        "build": {
        "options": {
            "store": false
        }
        },
        "plan": {
        "options": {
            "store": false
        }
        }
    },
    "$schema": "https://opencode.ai/config.json"
    }
EOF
```


If you need to switch from different models, you can edit the `~/.bashrc`
```shell
# 使用 MiniMax M2.5
alias oc-minimax='OPENCODE_CONFIG=~/.config/opencode/minimax.json opencode'

# 使用 OpenAI GPT-5.2-codex
alias oc-gpt='OPENCODE_CONFIG=~/.config/opencode/gpt.json opencode'

# 使用默认配置
alias oc='opencode'
```

And the `source ~/.bashrc`


