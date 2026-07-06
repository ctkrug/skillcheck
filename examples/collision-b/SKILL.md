---
name: good-skill
description: A second skill that reuses an existing name. Use when demonstrating collisions.
---

# Collision B

This skill deliberately reuses the name `good-skill`. Skillcheck's project-level
`duplicate-name` rule flags both this file and `good-skill/SKILL.md` as errors,
because at runtime only one of them would ever register.
