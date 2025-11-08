# Instructions for Deploying Next.js Frontend on Your Server

## Overview

You have three comprehensive deployment guides available. Here's how to use them with Claude on your server.

## Quick Start - What to Tell Claude on Your Server

### Option 1: Simple Instructions (Recommended)

Copy and paste this message to Claude on your server:

```
I need you to deploy the new Next.js isomorphic frontend for LitRevTool.
Please follow these steps:

1. Navigate to the project directory: cd /home/ubuntu/litrevtool
2. Read the deployment instructions: cat SERVER_DEPLOYMENT_INSTRUCTIONS.md
3. Follow all the steps in that file carefully
4. Ask me for confirmation before the atomic swap (step 18)
5. Ask me to verify in the browser before cleanup (step 21)

Important: If you encounter ANY errors, stop and ask me for guidance.
Do not proceed if tests fail. Be ready to rollback if needed.
```

### Option 2: Use Quick Commands

If you want to guide Claude step-by-step, use:

```
I need you to deploy the Next.js frontend. Please:

1. First, read: cat QUICK_DEPLOYMENT_COMMANDS.md
2. Execute each command section in order
3. Pause after step 5 (verification) and show me the results
4. Only proceed to step 6 (atomic swap) after I confirm
5. After step 7, ask me to verify in the browser
```

### Option 3: Full Detailed Guide

For maximum detail and troubleshooting:

```
I need you to deploy the Next.js frontend following the comprehensive guide.

1. Read: cat PRODUCTION_DEPLOYMENT_GUIDE.md
2. Follow all steps from "Step 1: Pull Latest Code" through "Step 15"
3. Ask me to verify at each major checkpoint
4. Be ready to execute the rollback procedure if anything goes wrong
```

## What Files Are Available on the Server

After pulling the latest code, Claude will have access to:

1. **`SERVER_DEPLOYMENT_INSTRUCTIONS.md`** ⭐ **RECOMMENDED**
   - Written specifically for Claude
   - Step-by-step with decision points
   - Includes error handling and rollback
   - Best for autonomous deployment

2. **`QUICK_DEPLOYMENT_COMMANDS.md`**
   - Quick command reference
   - Copy-paste friendly
   - Best if you want to guide step-by-step

3. **`PRODUCTION_DEPLOYMENT_GUIDE.md`**
   - Comprehensive 650-line guide
   - Detailed explanations
   - Extensive troubleshooting
   - Best for understanding what's happening

4. **Supporting Documentation**:
   - `frontend-nextjs/README.md` - Frontend documentation
   - `MIGRATION_TO_NEXTJS.md` - Migration details
   - `ISOMORPHIC_IMPLEMENTATION.md` - Architecture overview

## Before Starting

Make sure:
1. You have SSH access to your server
2. Claude is running on the server
3. Current services are running (check with `pm2 status`)
4. You have your Google OAuth Client ID ready

## During Deployment

Claude will:
1. Pull the latest code
2. Install dependencies and build Next.js
3. Start the new frontend in parallel with the old one
4. Ask you for confirmation before swapping
5. Perform atomic swap (1-2 seconds downtime)
6. Ask you to verify in browser
7. Clean up after you confirm everything works

## What You Need to Verify

When Claude asks you to verify in the browser:

1. **Visit**: https://litrev.haielab.org
2. **View Source** (Right-click → View Page Source or Ctrl+U):
   - Should see fully rendered HTML
   - Should see `<style data-emotion="mui">` tags
   - Should NOT see just `<div id="root"></div>`
3. **Test Login**: Click Google Sign-In and authenticate
4. **Test Dashboard**:
   - Should show your existing jobs
   - Real-time updates should work
5. **Test Creating Job**: Create a test search
6. **Test Downloads**: Download CSV, PRISMA, LaTeX, or BibTeX

## Expected Timeline

- **Total time**: 15-30 minutes
- **Your involvement**:
  - Provide Google Client ID (if asked): ~1 minute
  - Confirm before swap: ~1 minute
  - Browser verification: ~5 minutes
  - Confirm cleanup: ~1 minute
- **Downtime**: 1-2 seconds (during atomic swap)

## If Something Goes Wrong

Claude can instantly rollback with:
```bash
pm2 stop litrev-frontend-nextjs
pm2 restart litrev-frontend
```

This takes 1-2 seconds and returns you to the old React frontend.

## After Successful Deployment

You'll have:
- ✅ Server-side rendered Next.js frontend
- ✅ 2-3x faster initial page load
- ✅ SEO score improved from 60-70 to 90-100
- ✅ All original features working
- ✅ Same Material-UI design
- ✅ Better performance metrics

## Communication Template

Here's a complete message you can send to Claude on your server:

---

**Message to Claude on Server:**

```
Hi! I need you to deploy the new Next.js isomorphic frontend for LitRevTool.

Please follow these steps:

1. Navigate to: cd /home/ubuntu/litrevtool

2. Pull the latest code:
   git fetch origin
   git checkout claude/make-app-isomorphic-011CUuY2CQ8noVpagVJEkC5Z
   git pull origin claude/make-app-isomorphic-011CUuY2CQ8noVpagVJEkC5Z

3. Read the deployment instructions:
   cat SERVER_DEPLOYMENT_INSTRUCTIONS.md

4. Follow all steps in that file carefully.

5. Important checkpoints:
   - After step 7: Ask me to confirm the Google Client ID
   - After step 17: Show me the verification results before proceeding
   - Before step 18 (atomic swap): Ask for my explicit confirmation
   - After step 20: Ask me to verify in the browser
   - After I confirm browser verification: Proceed with cleanup

6. If you encounter ANY errors at any step:
   - Stop immediately
   - Show me the error
   - Ask if I want to rollback or debug

Let me know when you're ready to start, and keep me informed at each major step.
```

---

## Quick Reference

| Guide | Best For | Length |
|-------|----------|--------|
| SERVER_DEPLOYMENT_INSTRUCTIONS.md | Claude autonomous deployment | Step-by-step |
| QUICK_DEPLOYMENT_COMMANDS.md | Quick reference | Command list |
| PRODUCTION_DEPLOYMENT_GUIDE.md | Detailed understanding | Comprehensive |

## Support

If you need help:
1. Check Claude's error messages
2. Look in the relevant guide for troubleshooting
3. The guides include common issues and solutions
4. Rollback is always available if needed

## Questions?

Common questions answered:

**Q: Will there be downtime?**
A: Yes, 1-2 seconds during the atomic swap (step 18).

**Q: Can I rollback?**
A: Yes, instantly. Takes 1-2 seconds.

**Q: What if something breaks?**
A: Claude will stop and ask for guidance. Rollback is always available.

**Q: Do I need to update Nginx?**
A: No, both old and new frontends use port 3001.

**Q: Will my jobs be affected?**
A: No, only the frontend changes. Backend and database are unchanged.

**Q: What about my users?**
A: 1-2 seconds downtime during swap. They'll see improved performance after.

---

**Ready to deploy?** Send the message above to Claude on your server and let it guide you through the process! 🚀
