# How to Contribute

Winston is one of Gorilla Logic projects which is under active development and is also being used to provide information to all collaborators about general inquiries like available PTO, nearby wellness events and others. Hopefully this document makes the process for contributing clear and answers some questions that you may have.

## Open Development

All work on WINSTON-LAMBDA happens directly on GitHub. Both core team members and other contributors send pull requests which go through a code review process.

## Branch Organization

We will do our best to keep the master branch in good shape, with tests passing at all times.

If we happen to find a bug or have ideas for new functionality, we will create a Github Issue, this issue will have an auto-generated number, which we will use to create our branch name with the following structure:

- Issue: #8
- Branch to work that issue: `GH-8`
- All commits should have `GH-8` at the beginning, so issues and commits are integrated

If you send a pull request, please do it against the master branch.

## Semantic Versioning

WINSTON-LAMBDA follows semantic versioning. We release patch versions for bugfixes, minor versions for new features, and major versions for any breaking changes. Be sure to update the `package.json` version on every deploy.

## Bugs

### Where to Find Known Issues

We are using GitHub Issues for our public bugs. We keep a close eye on this and try to make it clear when we have an internal fix in progress. Before filing a new task, try to make sure your problem doesn’t already exist.

### Reporting New Issues

The best way to get your bug fixed is to provide a reduced test case. Feel free to create a Github Issue with your bug description and steps to reproduce.

## How to Get in Touch

Contact any of the core contributors, you can find them on `CONTRIBUTORS.md`

## Proposing a Change

If you intend to change the bot, or make any non-trivial changes to the implementation, we recommend filing an issue. This lets us reach an agreement on your proposal before you put significant effort into it.

If you’re only fixing a bug, we recommend to file an issue detailing what you’re fixing. This is helpful in case we don’t accept that specific fix but want to keep track of the issue.

## How to Contribute to an Open Source Project on GitHub

To help you get your feet wet and get you familiar with our contribution process, we have a list of good first issues that contain bugs that have a relatively limited scope. This is a great place to get started.

If you decide to fix an issue, please be sure to check the comment thread in case somebody is already working on a fix. If nobody is working on it at the moment, please leave a comment stating that you intend to work on it so other people don’t accidentally duplicate your effort.

If somebody claims an issue but doesn’t follow up for more than two weeks, it’s fine to take it over but you should still leave a comment.

### Sending a Pull Request

The core contributors are usually monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation. We’ll do our best to provide updates and feedback throughout the process.

Before submitting a pull request, please make sure the following is done:

- Clone the repository and create your branch from master.
- Run `npm install` in the repository root.
- Lint/Format your code with ESLINT `npm run lint`.

### Contribution Prerequisites

- You have Node installed at v8.0.0+
- You are familiar with Git.
- Development Workflow
- After cloning WINSTON-LAMBDA, run `npm install` to fetch its dependencies. Then, you can run several commands:
  - `npm run lint` checks the code style.

### Style Guide

We use an automatic code formatter called Prettier and ESLint to lint it. Run `npm run lint` after making any changes to the code, we recommend the `eslint` plugin for VSCode. Our linter will catch most issues that may exist in your code.
