# Git Commands Code Book

This code book is focused on workflows for working with feature branches, GitHub issues, and pull requests.

## 1. Common GitHub issue + feature branch workflow

1. Create a branch from the main branch:
```bash
git checkout main
git pull origin main
git checkout -b feature/ISSUE-123-description
```

2. Link the branch to the issue in your branch name:
- `feature/ISSUE-123-add-login-form`
- `bugfix/ISSUE-456-fix-avatar-upload`

3. Work locally and commit often:
```bash
git add .
git commit -m "ISSUE-123: add login form UI"
```

4. Push the branch to GitHub:
```bash
git push -u origin feature/ISSUE-123-description
```

5. Create a pull request on GitHub and reference the issue:
- Use `Fixes #123` or `Closes #123` in the PR description to close the issue automatically.

## 2. Branch management

- Show branches:
```bash
git branch
git branch -a
```

- Rename current branch:
```bash
git branch -m new-name
```

- Delete local branch:
```bash
git branch -d feature/ISSUE-123-description
```

- Delete remote branch:
```bash
git push origin --delete feature/ISSUE-123-description
```

## 3. Synchronize with upstream

- Fetch remote refs without merging:
```bash
git fetch origin
```

- Update local main and keep it current:
```bash
git checkout main
git pull origin main
```

- Rebase a feature branch on top of latest main:
```bash
git checkout feature/ISSUE-123-description
git fetch origin
git rebase origin/main
```

- Alternative: merge main into feature branch:
```bash
git checkout feature/ISSUE-123-description
git merge origin/main
```

## 4. Working with remotes

- Add a remote:
```bash
git remote add origin https://github.com/<owner>/<repo>.git
```

- Verify remotes:
```bash
git remote -v
```

- Set upstream for current branch:
```bash
git branch --set-upstream-to=origin/feature/ISSUE-123-description
```

- Push current branch and set tracking:
```bash
git push -u origin feature/ISSUE-123-description
```

## 5. Pull request / GitHub issue commands

- Reference an issue in a commit or PR message:
```text
Fixes #123: update authentication flow
```

- Close an issue automatically on merge:
```text
Closes #123
```

- Mention issues without closing:
```text
Related to #123
```

## 6. Useful status and diff commands

- Check repository state:
```bash
git status
```

- Review changes before commit:
```bash
git diff
```

- Review staged changes:
```bash
git diff --staged
```

- Show recent commits:
```bash
git log --oneline --decorate --graph --all
```

## 7. Rebase, amend, and fix history

- Amend last commit message or add changes:
```bash
git add .
git commit --amend --no-edit
```

- Reword last commit message:
```bash
git commit --amend -m "ISSUE-123: improved login form" 
```

- Interactive rebase for cleanup:
```bash
git rebase -i HEAD~3
```

> Use rebase carefully on branches already pushed and shared.

## 8. Stashing work

- Save uncommitted work:
```bash
git stash push -m "WIP: ISSUE-123 partial form work"
```

- List stashes:
```bash
git stash list
```

- Apply latest stash:
```bash
git stash apply
```

- Drop latest stash:
```bash
git stash drop
```

## 9. Resolving conflicts

1. Identify files with conflicts.
2. Open and fix conflict markers.
3. Stage the resolved files:
```bash
git add <file>
```
4. Continue rebase or merge:
```bash
git rebase --continue
```
` or `git merge --continue`

## 10. Recovering from mistakes

- Undo unstaged changes:
```bash
git checkout -- <file>
```

- Discard all local changes:
```bash
git reset --hard HEAD
```

- Restore a deleted file:
```bash
git checkout -- <file>
```

- Reset branch to a remote state:
```bash
git fetch origin
git reset --hard origin/main
```

## 11. Notes for GitHub feature issue flow

- Use one feature branch per issue.
- Keep branch names meaningful and issue-linked.
- Rebase or merge from `main` frequently to reduce conflicts.
- Write PR titles and descriptions that mention the issue number.
- Use GitHub issue keywords like `Fixes #<issue>` to auto-close issues.

---

This document is intended as a quick reference. Add project-specific conventions here if your repo has additional branching or commit message rules.