# Instructions for Claude on Production Server

**Context**: You are Claude running on a production server. You need to deploy the new Next.js isomorphic frontend to replace the existing React frontend with minimal downtime.

## Your Task

Deploy the Next.js frontend by following the steps in `PRODUCTION_DEPLOYMENT_GUIDE.md` or use the quick commands in `QUICK_DEPLOYMENT_COMMANDS.md`.

## Step-by-Step Instructions for You

### Phase 1: Preparation

1. **Read the deployment guide**:
   ```bash
   cat PRODUCTION_DEPLOYMENT_GUIDE.md
   ```

2. **Check current system status**:
   ```bash
   pm2 status
   node --version  # Must be 18+
   df -h           # Check disk space
   pwd             # Verify you're in the project directory
   ```

3. **Create backup**:
   ```bash
   pm2 save
   ```

### Phase 2: Pull New Code

4. **Pull the latest code**:
   ```bash
   git fetch origin
   git checkout claude/make-app-isomorphic-011CUuY2CQ8noVpagVJEkC5Z
   git pull origin claude/make-app-isomorphic-011CUuY2CQ8noVpagVJEkC5Z
   ```

5. **Verify new frontend directory exists**:
   ```bash
   ls -la frontend-nextjs/
   ```
   - You should see: `app/`, `components/`, `lib/`, `package.json`, `next.config.js`

### Phase 3: Configuration

6. **Navigate to frontend directory**:
   ```bash
   cd frontend-nextjs
   ```

7. **Get the Google Client ID from backend**:
   ```bash
   cat ../.env | grep "GOOGLE_CLIENT_ID="
   ```
   - Note the value (it will look like: `337048330114-...apps.googleusercontent.com`)

8. **Create `.env.local` file**:

   **IMPORTANT**: You need to ask the user for confirmation of the Google Client ID before proceeding, or use the value from the backend `.env` file.

   Create the file with production values:
   ```bash
   cat > .env.local << 'EOF'
   NEXT_PUBLIC_API_URL=https://litrev.haielab.org
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=PASTE_VALUE_FROM_BACKEND_ENV_HERE
   NEXT_PUBLIC_APP_URL=https://litrev.haielab.org
   EOF
   ```

9. **Verify environment file**:
   ```bash
   cat .env.local
   ```

### Phase 4: Build

10. **Install dependencies**:
    ```bash
    npm install
    ```
    - Expected: ~400-450 packages installed
    - Time: 30-60 seconds

11. **Build production bundle**:
    ```bash
    npm run build
    ```
    - Expected output should end with: `✓ Compiled successfully`
    - Should show routes: `/`, `/login`, `/dashboard`

12. **Create logs directory**:
    ```bash
    mkdir -p logs
    ```

13. **Go back to project root**:
    ```bash
    cd ..
    pwd  # Should show: /home/ubuntu/litrevtool (or your project path)
    ```

### Phase 5: Deploy

14. **Start Next.js frontend** (parallel to old React):
    ```bash
    pm2 start ecosystem.config.nextjs.js --only litrev-frontend-nextjs
    ```

15. **Check status**:
    ```bash
    pm2 status
    ```
    - You should see BOTH `litrev-frontend` (old) and `litrev-frontend-nextjs` (new) running

16. **Check Next.js logs for errors**:
    ```bash
    pm2 logs litrev-frontend-nextjs --lines 50 --nostream
    ```
    - Expected: Should see "ready started server on 0.0.0.0:3001"
    - **CRITICAL**: If you see ANY errors, STOP and report to the user. Do NOT proceed.

17. **Verify Next.js works**:
    ```bash
    # Test 1: HTTP response
    curl -I http://localhost:3001
    # Expected: HTTP/1.1 200 OK

    # Test 2: SSR is working (check for rendered HTML)
    curl -s http://localhost:3001/login | grep -i "litrevtool"
    # Expected: Should find "LitRevTool" in the HTML

    # Test 3: Verify it's SSR (not just client-side)
    curl -s http://localhost:3001/login | grep -o "<h1.*LitRevTool.*</h1>"
    # Expected: Should show the rendered h1 tag
    ```

**DECISION POINT**:
- If ALL tests pass → Proceed to step 18
- If ANY test fails → STOP, report errors to user, DO NOT PROCEED

### Phase 6: Atomic Swap (Critical Step)

18. **Perform atomic swap** (this is the critical moment with 1-2 seconds downtime):

    **IMPORTANT**: Before running this command, ensure:
    - [ ] All tests in step 17 passed
    - [ ] No errors in Next.js logs
    - [ ] pm2 status shows litrev-frontend-nextjs as "online"

    ```bash
    pm2 stop litrev-frontend && pm2 restart litrev-frontend-nextjs
    ```

19. **Immediately check status**:
    ```bash
    pm2 status
    ```
    - Expected: `litrev-frontend-nextjs` should be "online"
    - Expected: `litrev-frontend` should be "stopped"

### Phase 7: Verification

20. **Check production site**:
    ```bash
    # Test 1: Site is up
    curl -I https://litrev.haielab.org
    # Expected: HTTP/2 200

    # Test 2: SSR is working
    curl -s https://litrev.haielab.org/login | grep -i "litrevtool"
    # Expected: Should find "LitRevTool"

    # Test 3: Check logs for errors
    pm2 logs litrev-frontend-nextjs --lines 30 --nostream
    # Expected: No errors
    ```

21. **Ask user to verify in browser**:

    Tell the user:
    > "Deployment complete! Please verify the following in your browser:
    > 1. Visit https://litrev.haielab.org
    > 2. Right-click → View Page Source - you should see fully rendered HTML (not just `<div id="root">`)
    > 3. Test Google OAuth login
    > 4. Check that the dashboard loads and shows your jobs
    > 5. Test creating a new job
    > 6. Test downloading results (CSV, PRISMA, LaTeX, BibTeX)
    >
    > If everything works, I'll proceed with cleanup. If anything fails, I can instantly rollback."

### Phase 8: Cleanup (Only after user confirms everything works)

22. **Delete old React frontend from PM2**:
    ```bash
    pm2 delete litrev-frontend
    ```

23. **Save PM2 configuration**:
    ```bash
    pm2 save
    ```

24. **Verify final status**:
    ```bash
    pm2 status
    ```
    - Should show: `litrev-backend`, `litrev-frontend-nextjs`, `litrev-worker` (or similar)

25. **Report success to user** with these metrics:
    ```bash
    # Show running services
    pm2 status

    # Show recent logs (last 20 lines)
    pm2 logs litrev-frontend-nextjs --lines 20 --nostream
    ```

## Emergency Rollback

If at ANY point something goes wrong:

```bash
# Instant rollback (takes 1-2 seconds)
pm2 stop litrev-frontend-nextjs
pm2 restart litrev-frontend

# Verify rollback
pm2 status
curl -I https://litrev.haielab.org
```

Then report to the user what went wrong and what you rolled back.

## Common Issues You Might Encounter

### Issue 1: Build Fails
**Error**: TypeScript errors or build errors during `npm run build`

**Action**:
1. Check the error message
2. Try: `rm -rf .next node_modules && npm install && npm run build`
3. If still fails, report error to user

### Issue 2: Next.js Won't Start
**Error**: PM2 shows "errored" or "stopped" for litrev-frontend-nextjs

**Action**:
1. Check logs: `pm2 logs litrev-frontend-nextjs --err --lines 100`
2. Common cause: Port 3001 already in use
3. Solution: Make sure old frontend is stopped first
4. Report error details to user

### Issue 3: Environment Variable Wrong
**Error**: NEXT_PUBLIC_GOOGLE_CLIENT_ID not set or incorrect

**Action**:
1. Ask user to provide the correct Google Client ID
2. Update `.env.local` file
3. Rebuild: `cd frontend-nextjs && npm run build`
4. Restart: `pm2 restart litrev-frontend-nextjs`

### Issue 4: White Screen in Browser
**Error**: User reports white screen after deployment

**Action**:
1. Check browser console would show errors (ask user)
2. Verify API is accessible: `curl https://litrev.haielab.org/api/v1/health`
3. Check Next.js logs: `pm2 logs litrev-frontend-nextjs --lines 50`
4. If can't fix quickly, rollback and investigate

## Success Criteria

Report success to user when:
- [x] PM2 shows `litrev-frontend-nextjs` as "online"
- [x] No errors in logs
- [x] `curl https://litrev.haielab.org` returns HTTP/2 200
- [x] View Source shows fully rendered HTML (user confirms)
- [x] Login works (user confirms)
- [x] Dashboard works (user confirms)
- [x] Downloads work (user confirms)

## Important Reminders

1. **Always verify before proceeding** - Don't skip verification steps
2. **Check logs frequently** - `pm2 logs litrev-frontend-nextjs`
3. **Be ready to rollback** - If anything seems wrong, rollback immediately
4. **Communicate with user** - Keep them informed of progress and ask for confirmation
5. **Don't delete old frontend** until user confirms everything works

## Questions to Ask User

Before starting:
- "I'm about to deploy the Next.js frontend. The deployment will take 15-30 minutes with ~1-2 seconds of downtime. Are you ready to proceed?"

During configuration:
- "I found the Google Client ID in the backend .env file. Should I use: `[VALUE]`?"

After atomic swap:
- "Deployment complete! Please test the site in your browser and confirm everything works before I proceed with cleanup."

After user confirms:
- "Everything looks good! I'll now clean up the old frontend from PM2 and save the configuration."

## Your Communication Style

- Be clear and concise
- Explain what you're doing at each step
- If you encounter an error, explain it in plain language
- Always offer to rollback if something goes wrong
- Ask for user confirmation at critical steps

## Final Note

You have all the information and tools needed to complete this deployment. Follow the steps carefully, verify at each stage, and communicate clearly with the user. If anything is unclear or goes wrong, ask the user for guidance or perform a rollback.

Good luck! 🚀
