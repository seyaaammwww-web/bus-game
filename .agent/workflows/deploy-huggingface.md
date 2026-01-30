---
description: Deploy changes to Hugging Face Space
---

# Deploy to Hugging Face

// turbo-all

This workflow pushes the latest changes to the Hugging Face Space.

## Steps

1. Stage all changes:
```bash
git add -A
```

2. Commit changes with a descriptive message:
```bash
git commit -m "Update: [describe changes]"
```

3. Push to Hugging Face:
```bash
git push huggingface main
```

## Notes
- The Hugging Face Space URL: https://huggingface.co/spaces/moamed12/bus-game
- Make sure you're authenticated with Hugging Face CLI or have credentials cached
