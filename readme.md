# 🦔 AI-Hedgehog

Your friendly AI coding companion that provides real-time feedback on your code as you write it.

Instead of complex and fancy copilot or cursor style solutions just open this tool from the command line along side your favourite editor.

Hedgehog's always recommend writing code yourself to stay sharp but having help and getting suggestions isn't a bad idea!

## Features

- 🔍 Watches your code files and provides instant AI feedback when they change
- 🤖 Supports multiple AI models (Claude, Llama, etc.)
- 🛠️ Works with any editor or IDE
- 🚀 Easy to use with minimal setup
- 🔧 Highly configurable

## Installation

Requires a [replicate.com](https://replicate.com) account.

```bash
export REPLICATE_API_TOKEN=r8_xxx
git clone https://github.com/hibernatus-hacker/ai-hedgehog
cd ai-hedgehog
npm i
sudo npm link
ai-hedgehog -d ./directory_to_watch # from anywhere
```

## Disclaimer

This is suitable for working on open source projects but don't use this on proprietary code bases.

Using replicate means that your sending code to a third party. 

Don't use this project on any code with sensitive hardcoded secrets. 

## Todo.

Allow integrating with ollama for running local models.
