# Implementation Plan: Match Receipt Bug Fix, End Game Flow, and URL-Encoded Sharing

---

## 1. Bug Fix: Match Receipt Standings Wrong
- **Root Cause**: When a match score is recorded (`recordMatchScore`), the match object is updated and marked completed, but `applyMatchResults` (which updates player wins, losses, games played, and point differentials) was only called when completing the *entire round* (`completeCurrentRound`). Thus, opening the Match Receipt modal right after scoring showed stale pre-match player stats.
- **Solution**: In `SessionContext`, when `recordMatchScore` (or when a match is completed/ended) runs, we will immediately compute and update player stats for the finished match (or apply `applyMatchResults` for completed matches in the current round) so that player standings and player records in `MatchShareModal` are 100% accurate instantly. Also, if a match has `durationSeconds === 0` and never ran / 0 secs, display `"Not timed"` instead of `"0m 00s"`.

---

## 2. Feature: End Game Anytime
- **Live Court Button**: On each active court card in `LiveView`, add an "End Game" button visible whenever a match is in progress (timer running, paused, or not started).
- **Confirm Sheet / Modal**: Tapping "End Game" opens a confirmation sheet showing current score and both teams.
- **Winner Selection**:
  - Pre-selects the team currently ahead.
  - If scores are tied, requires picking a winning team OR choosing **"Don't record result"** (discards match without changing stats).
- **Save & Rotation**: Uses the same save/finish code path as normal match completion so stats, history, and standings stay in sync. Frees up court and triggers auto-rotation per current settings.
- **Match Receipt**: Opens the Official Match Receipt modal immediately.

---

## 3. Sharing via URL-Encoded Base64 JSON
- **Why Choose URL-Encoded Base64**: Since no cloud backend (Supabase) is provisioned, encoding match recap data into a compressed Base64 JSON string in the shareable link/QR code (`${window.location.origin}/?recap=...`) allows instant cross-device sharing when scanned or opened on another phone.
- **Recap Loader**: On app load, check for `?recap=...` query parameter, decode/decompress the JSON payload, and open the MatchShareModal in read-only standalone mode with a friendly "Recap not found" fallback if decoding fails.
- **Sharing Action**: Use `navigator.share()` where available, otherwise copy URL to clipboard with a toast notification.
