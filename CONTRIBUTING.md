# Contributing to OMSS Core

Thank you for your interest in contributing to OMSS Core! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```sh
   git clone https://github.com/<your-username>/core.git
   cd core
   ```
3. **Install** dependencies:
   ```sh
   npm install
   ```
4. **Build** the project:
   ```sh
   npm run build
   ```
5. **Run tests:**
   ```sh
   npm test
   ```

---

## Development Setup

| Command | Description |
| :--- | :--- |
| `npm run build` | Build the project with tsdown |
| `npm run dev` | Watch mode (rebuilds on file changes) |
| `npm test` | Run test suite with Vitest |
| `npm run format` | Format code with Prettier |
| `npm run example` | Run the example file |

---

## How to Contribute

### Reporting Bugs

Please use the **Bug Report** issue template. Include:
- A clear and descriptive title
- Steps to reproduce the behavior
- Expected vs. actual behavior
- Your environment (Node.js version, OS, `@omss/core` version)
- A minimal reproduction case if possible

### Suggesting Features

Please use the **Feature Request** issue template. Describe the problem you are trying to solve, not just the solution. This helps us understand the context and find the best approach together.

### Writing Code

1. Create a new branch from `main`:
   ```sh
   git checkout -b feat/my-feature
   ```
2. Make your changes.
3. Add or update tests to cover your changes.
4. Run the full test suite: `npm test`.
5. Format your code: `npm run format`.
6. Push your branch and open a Pull Request.

---

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

**Examples:**
```
feat(server): add plugin deregistration support
fix(hooks): prevent circular hook invocation
docs: update README plugin example
```

---

## Pull Request Process

1. Ensure all tests pass with 100% coverage: `npm test` (required).
2. Ensure code is formatted: `npm run format`.
3. Reference any related issues in the PR description (`Closes #123`).
4. A maintainer will review your PR. Please be patient — this is a small team.
5. Address any review feedback by pushing new commits to your branch.
6. Once approved, a maintainer will merge the PR.

---

## Security

Please **do not** open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.
