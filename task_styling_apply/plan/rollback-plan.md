# Rollback Plan: Tailwind CSS v4 Migration

**Bug ID**: task_styling_apply
**Plan Version**: 1.0
**Created**: 2025-10-22
**Recovery Time Objective (RTO)**: 2 minutes
**Recovery Point Objective (RPO)**: Last working commit

---

## Executive Summary

**Purpose**: Provide fast, reliable recovery if v4 migration fails
**Rollback Options**: 2 procedures (git revert OR downgrade to v3)
**Estimated Time**: 2-5 minutes
**Risk Level**: Very Low (well-tested procedures)

---

## Rollback Triggers

### Immediate Rollback Required

1. **Build Failure**
   - `npm run build` exits with error
   - Build time >5 minutes (normally 30s)
   - PostCSS processing fails

2. **CSS Generation Failure**
   - CSS file <10KB (expected 50-200KB)
   - Missing utility classes in output
   - Playwright tests show <80% success rate

3. **Production Issues**
   - User-facing styling errors
   - Console errors in browser
   - Broken UI in any critical path

4. **Performance Degradation**
   - Build time >3x slower than baseline
   - Page load time >2x slower
   - CSS bundle >500KB

### Considered Rollback (Evaluate First)

1. **Partial Styling Issues**
   - 80-99% of classes working
   - Isolated component issues
   - Non-critical page styling broken

2. **Custom Color Issues**
   - Theme colors not applying correctly
   - Color values incorrect
   - Color shades missing

**Evaluation Criteria**:
- Can issue be fixed in <30 minutes?
- Are workarounds available?
- Is rollback more risky than fixing forward?

---

## Rollback Procedure A: Git Revert (RECOMMENDED)

**When to Use**: Migration changes committed to git
**Time Required**: 2 minutes
**Risk**: Very Low
**Recommended**: Yes (cleanest rollback)

### Prerequisites
```bash
# Verify git status
git status

# Check recent commits
git log --oneline -5

# Identify migration commit
git log --grep "tailwind.*v4"
```

### Step 1: Revert Migration Commit (30 seconds)
```bash
# Find migration commit hash
MIGRATION_COMMIT=$(git log --grep "tailwind.*v4" --format="%H" -1)

# Revert the commit
git revert $MIGRATION_COMMIT --no-edit

# OR revert manually if you know the hash
git revert abc1234 --no-edit
```

**Expected Output**:
```
[feature/styling-fix def5678] Revert "Migrate to Tailwind CSS v4"
 2 files changed, 30 insertions(+), 45 deletions(-)
 create mode 100644 tailwind.config.ts
```

### Step 2: Clean Build Cache (30 seconds)
```bash
# Remove Next.js cache
rm -rf .next/

# Clear npm cache (optional but recommended)
rm -rf node_modules/.cache/
```

### Step 3: Rebuild Application (60 seconds)
```bash
# Production build
npm run build

# Expected output
# ✓ Compiled successfully
# ✓ CSS generated (~50-200KB)
```

### Step 4: Verify Rollback (30 seconds)
```bash
# Start dev server
npm run dev &

# Wait for server
sleep 5

# Check CSS size
curl -s http://localhost:3000/_next/static/css/app/onboarding/page.css | wc -c
# Expected: >50000 bytes

# Check for utility classes
curl -s http://localhost:3000/_next/static/css/app/onboarding/page.css | grep "\.flex"
# Expected: .flex{display:flex}

# Stop dev server
kill %1
```

### Step 5: Run Tests (Optional, 60 seconds)
```bash
# Quick smoke test
npx playwright test tests/tailwind-verification.spec.ts

# Expected: 100% pass rate
```

### Verification Checklist
- [ ] Git revert successful
- [ ] Build completes without errors
- [ ] CSS file >50KB
- [ ] Utility classes present in CSS
- [ ] Dev server starts successfully
- [ ] Basic styling works in browser
- [ ] Tests pass (if running)

**Total Time**: ~2 minutes (or ~3 minutes with tests)

---

## Rollback Procedure B: Downgrade to v3 (ALTERNATIVE)

**When to Use**: Migration not yet committed OR Procedure A fails
**Time Required**: 5 minutes
**Risk**: Low
**Recommended**: If Procedure A unavailable

### Step 1: Restore Configuration Files (15 seconds)
```bash
# Restore from backups (if created during migration)
cp app/globals.css.backup app/globals.css
cp tailwind.config.ts.backup tailwind.config.ts

# OR restore from last commit
git checkout HEAD -- app/globals.css
git checkout HEAD -- tailwind.config.ts

# Verify files restored
ls -l app/globals.css tailwind.config.ts
```

### Step 2: Downgrade Tailwind Packages (60 seconds)
```bash
# Remove v4 packages
npm uninstall tailwindcss @tailwindcss/postcss

# Install v3 packages
npm install -D tailwindcss@3.4.1 @tailwindcss/postcss@3.4.1

# Verify installation
npm list tailwindcss
# Expected: tailwindcss@3.4.1
```

**Expected package.json Changes**:
```json
{
  "devDependencies": {
    "tailwindcss": "^3.4.1",              // ← Changed from 4.1.15
    "@tailwindcss/postcss": "^3.4.1"      // ← Changed from 4.1.15
  }
}
```

### Step 3: Verify Configuration Files (30 seconds)
```bash
# Check tailwind.config.ts (v3 format)
cat tailwind.config.ts
# Expected: export default config (v3 format)

# Check app/globals.css (v3 format)
cat app/globals.css
# Expected: @tailwind base/components/utilities (not @import)
```

### Step 4: Clean and Rebuild (90 seconds)
```bash
# Clean everything
rm -rf .next/
rm -rf node_modules/.cache/
npm cache clean --force

# Rebuild
npm run build

# Expected output
# ✓ Compiled successfully
# ✓ Tailwind CSS v3.x.x
```

### Step 5: Verify Downgrade (30 seconds)
```bash
# Start dev server
npm run dev &

# Wait for server
sleep 5

# Verify CSS generation
curl -s http://localhost:3000/_next/static/css/app/onboarding/page.css | wc -c
# Expected: >50000 bytes

# Check utility classes
curl -s http://localhost:3000/_next/static/css/app/onboarding/page.css | grep "\.flex"
# Expected: .flex{display:flex}

# Stop dev server
kill %1
```

### Step 6: Run Tests (Optional, 60 seconds)
```bash
# Full test suite
npx playwright test

# Expected: All tests pass
```

### Verification Checklist
- [ ] v3 packages installed
- [ ] Configuration files restored
- [ ] Build completes without errors
- [ ] CSS file >50KB
- [ ] Utility classes present
- [ ] Custom colors work
- [ ] Dev server starts
- [ ] Tests pass (if running)

**Total Time**: ~5 minutes

---

## Verification Steps

### Quick Verification (2 minutes)
```bash
# 1. Check package version
npm list tailwindcss
# Expected: 3.4.1 OR successful revert to working state

# 2. Build test
npm run build
# Expected: Success

# 3. CSS size check
ls -lh .next/static/css/*.css
# Expected: >50KB files

# 4. Manual browser test
npm run dev
# Navigate to http://localhost:3000/onboarding
# Expected: Fully styled UI
```

### Full Verification (5 minutes)
```bash
# 1. Run automated tests
npx playwright test tests/tailwind-verification.spec.ts

# 2. Visual QA
# - Check all major pages
# - Verify responsive design
# - Test custom colors

# 3. Performance check
npm run build
# Time should be ~30s (not >2 minutes)

# 4. CSS analysis
# - File size reasonable (50-200KB)
# - All utility classes present
# - Custom theme working
```

---

## Post-Rollback Actions

### Immediate (Within 1 hour)

1. **Document Failure**
   ```bash
   # Create incident report
   cat > task_styling_apply/rollback-incident.md <<EOF
   # Rollback Incident Report
   Date: $(date)
   Trigger: [Describe what went wrong]
   Procedure Used: [A or B]
   Time to Recover: [X minutes]
   Root Cause: [Analysis of failure]
   EOF
   ```

2. **Notify Team**
   - Inform team of rollback
   - Share incident report
   - Update project status

3. **Verify Stability**
   - Monitor for 30 minutes
   - Run full test suite
   - Check production if deployed

### Short-Term (Within 1 day)

1. **Root Cause Analysis**
   - Analyze why migration failed
   - Review logs and error messages
   - Identify gaps in planning

2. **Update Migration Plan**
   - Address identified issues
   - Add missing mitigation steps
   - Improve testing procedures

3. **Plan Retry** (if desired)
   - Set new timeline
   - Add additional safety measures
   - Conduct team review

### Long-Term (Within 1 week)

1. **Improve Process**
   - Update rollback procedures
   - Add automated safeguards
   - Enhance testing coverage

2. **Knowledge Sharing**
   - Document lessons learned
   - Share with team
   - Update best practices

---

## Emergency Rollback (Production)

**If v4 migration deployed to production and failing**

### Critical Severity (1 minute)
```bash
# 1. Immediate revert (use CI/CD if available)
git revert HEAD --no-edit
git push origin main --force-with-lease

# 2. Trigger emergency deployment
# [Use your deployment process]

# 3. Monitor deployment
# [Use your monitoring tools]
```

### High Severity (5 minutes)
```bash
# 1. Checkout last known good commit
git log --oneline -10
git checkout <last-good-commit>

# 2. Create emergency branch
git checkout -b hotfix/revert-tailwind-v4

# 3. Deploy emergency fix
# [Use your deployment process]

# 4. Clean up
git checkout main
git merge hotfix/revert-tailwind-v4
```

---

## Rollback Testing

### Test Procedure A (Before Migration)
```bash
# 1. Make a test commit
git add .
git commit -m "TEST: Verify rollback procedure"

# 2. Revert it
git revert HEAD --no-edit

# 3. Verify revert worked
git log --oneline -3

# 4. Clean up
git reset --hard HEAD~2
```

### Test Procedure B (Before Migration)
```bash
# 1. Backup current state
cp app/globals.css app/globals.css.test-backup
cp tailwind.config.ts tailwind.config.ts.test-backup

# 2. Modify files
echo "/* TEST */" >> app/globals.css

# 3. Restore from backup
cp app/globals.css.test-backup app/globals.css

# 4. Verify restoration
grep "TEST" app/globals.css
# Expected: No match (file restored)

# 5. Clean up
rm app/*.test-backup
```

---

## Success Criteria

### Rollback Successful If:
- [ ] Application builds without errors
- [ ] CSS file size >50KB
- [ ] All utility classes work (100% test pass)
- [ ] Custom colors apply correctly
- [ ] No console errors
- [ ] Performance metrics normal
- [ ] Visual appearance correct

### Rollback Failed If:
- Build still fails
- Styling still broken
- Tests still failing
- New errors introduced

**If rollback fails**: Escalate to senior developer for manual recovery

---

## Prevention Measures

### Before Next Migration Attempt

1. **Enhanced Testing**
   - Add more granular tests
   - Test on isolated branch first
   - Use staging environment

2. **Phased Rollout**
   - Test on development first
   - Deploy to staging
   - Canary deployment to production

3. **Better Monitoring**
   - Add CSS generation validation
   - Monitor build metrics
   - Track error rates

4. **Team Preparation**
   - Review migration plan as team
   - Conduct dry run
   - Assign roles for rollback

---

## References

- Fix Strategy: `/home/zineng/workspace/workflow/task_styling_apply/plan/fix-strategy.md`
- Risk Assessment: `/home/zineng/workspace/workflow/task_styling_apply/plan/risk-assessment.md`
- Decision Log: `/home/zineng/workspace/workflow/task_styling_apply/plan/decision-log.md`
- Git Documentation: https://git-scm.com/docs/git-revert
- Tailwind v3 Docs: https://v3.tailwindcss.com/docs
