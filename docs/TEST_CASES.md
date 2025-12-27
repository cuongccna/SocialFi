# CryptoCrush SocialFi - Test Cases

## Overview
This document contains comprehensive test cases for all features of the CryptoCrush SocialFi Dating Telegram Mini App.

---

## 1. Authentication Module

### 1.1 Telegram Login
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| AUTH-001 | Valid Telegram login | Open app in Telegram Mini App | User authenticated, redirected to Home |
| AUTH-002 | Invalid initData | Send request without valid Authorization header | 401 Unauthorized error |
| AUTH-003 | Expired initData | Send request with expired auth_date | 401 Unauthorized error |
| AUTH-004 | New user registration | First time user opens app | New user created with 100 $LOVE bonus |
| AUTH-005 | Returning user | Existing user opens app | User data loaded, balance preserved |

### 1.2 User Profile
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| AUTH-006 | Get user profile | Call GET /api/auth/me | Returns user data with balance |
| AUTH-007 | Profile stats | Navigate to Profile page | Shows matches, likes, rank correctly |

---

## 2. Feed & Swipe Module

### 2.1 Feed Loading
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| FEED-001 | Load feed | Navigate to Feed tab | Shows list of discoverable profiles |
| FEED-002 | Empty feed | All profiles swiped | Shows "No more profiles" message |
| FEED-003 | Feed pagination | Swipe through 10+ profiles | New profiles loaded seamlessly |

### 2.2 Swipe Actions
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| SWIPE-001 | Swipe right (LIKE) | Swipe right on profile | +1 $LOVE earned, target price increases |
| SWIPE-002 | Swipe left (PASS) | Swipe left on profile | Target price decreases |
| SWIPE-003 | Swipe up (SUPERLIKE) | Swipe up on profile | +3 $LOVE earned, higher price boost |
| SWIPE-004 | Duplicate swipe | Swipe same user twice | 409 Conflict error |
| SWIPE-005 | Mutual match | Both users swipe right | Match created, both notified |

---

## 3. Matches & Chat Module

### 3.1 Matches List
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| MATCH-001 | Load matches | Navigate to Matches tab | Shows all mutual matches |
| MATCH-002 | Empty matches | User has no matches | Shows "No matches yet" message |
| MATCH-003 | Match details | Tap on match | Opens chat with match details |

### 3.2 Chat
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| CHAT-001 | Send message | Type and send message | Message appears in chat |
| CHAT-002 | Receive message | Match sends message | Message appears (via polling) |
| CHAT-003 | Mint contract button | Tap "Mint Contract" | Opens contract minting flow |

---

## 4. Prediction Markets Module

### 4.1 Markets List
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| MARKET-001 | Load markets | Navigate to Trade tab | Shows all open markets |
| MARKET-002 | Market details | View market card | Shows couple, pool, time remaining |
| MARKET-003 | Empty markets | No active markets | Shows "No open markets" message |

### 4.2 Placing Bets
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| BET-001 | Place LONG bet | Select LONG, enter amount, confirm | Bet placed, balance deducted |
| BET-002 | Place SHORT bet | Select SHORT, enter amount, confirm | Bet placed, balance deducted |
| BET-003 | Insufficient balance | Bet more than balance | Error: insufficient balance |
| BET-004 | Add to existing bet | Already bet LONG, bet more LONG | Amount added to existing bet |
| BET-005 | Opposite position blocked | Already bet LONG, try SHORT | Position disabled with "Locked" label |
| BET-006 | Payout calculation | View potential payout | Correct payout shown based on pool |

---

## 5. Leaderboard Module

### 5.1 Leaderboard Filters
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| LEAD-001 | Top Earners | Select "Top Earners" filter | Sorted by market_price descending |
| LEAD-002 | Most Active | Select "Most Active" filter | Sorted by activity score |
| LEAD-003 | Popular | Select "Popular" filter | Sorted by matches count |
| LEAD-004 | User rank shown | View leaderboard | Current user's rank displayed |

---

## 6. Tasks & Rewards Module

### 6.1 Daily Tasks
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| TASK-001 | Daily login | Open app | Auto-claims daily login reward |
| TASK-002 | Swipe 5 profiles | Complete 5 swipes | Task marked complete, claim available |
| TASK-003 | Claim reward | Tap claim button | $LOVE added to balance |
| TASK-004 | Already claimed | Try claim again same day | Error or disabled button |

### 6.2 One-Time Tasks
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| TASK-005 | First match | Get first match | One-time reward claimable |
| TASK-006 | Connect wallet | Connect TON wallet | One-time 25 $LOVE reward |
| TASK-007 | First contract | Mint first contract | 100 $LOVE reward |

---

## 7. Referrals Module

### 7.1 Referral System
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| REF-001 | Get referral code | Navigate to Referrals | Unique code displayed |
| REF-002 | Share invite link | Tap share button | Native share or copy link |
| REF-003 | Apply referral code | New user enters code | Referrer credited |
| REF-004 | Claim referral reward | Referred user completes first swipe | 50 $LOVE reward claimable |
| REF-005 | Invalid code | Enter non-existent code | Error message shown |

---

## 8. Wallet Module

### 8.1 TON Wallet Connection
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| WALLET-001 | Connect wallet | Open Wallet, tap TonConnect | Wallet selection modal appears |
| WALLET-002 | First connection bonus | Connect for first time | 25 $LOVE bonus awarded |
| WALLET-003 | View connected wallet | Already connected | Address displayed, copy button works |
| WALLET-004 | Disconnect wallet | Tap disconnect | Wallet removed from account |

---

## 9. Jury DAO Module

### 9.1 Dispute Voting
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| JURY-001 | Load disputes | Navigate to Jury | Shows pending disputes |
| JURY-002 | Vote plaintiff | Swipe/tap for plaintiff | Vote recorded, rewards given |
| JURY-003 | Vote defendant | Swipe/tap for defendant | Vote recorded, rewards given |
| JURY-004 | Already voted | Try vote same dispute | Disabled or filtered out |
| JURY-005 | Jury stats | View stats card | Shows total votes, rewards earned |

---

## 10. Error Handling

### 10.1 Network Errors
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| ERR-001 | Network offline | Disconnect internet | Error message, retry button |
| ERR-002 | Server error | Backend returns 500 | User-friendly error message |
| ERR-003 | Rate limited | Many rapid requests | 429 error handled gracefully |

### 10.2 Validation Errors
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| ERR-004 | Invalid input | Enter negative bet amount | Validation error shown |
| ERR-005 | Empty required field | Submit without required data | Field highlighted, error shown |

---

## Test Environment Setup

### Prerequisites
1. Telegram account with bot token configured
2. PostgreSQL database with seeded data
3. Node.js v20+ installed
4. Test users seeded in database

### Running Tests
```bash
# Backend tests (when implemented)
cd server
npm test

# Frontend tests (when implemented)
cd client
npm test
```

### Manual Testing via Telegram
1. Open BotFather, find @CryptoCrushBot
2. Start mini app from bot menu
3. Execute test cases manually
4. Verify results in database

---

## Test Data

### Test Users (telegram_id)
- 7599130386 - Main test user (Cuong Van)
- Seed additional users via `database/seed_*.sql`

### Test Matches
- Run `database/migrations/seed_real_matches.sql` for match data

---

## Notes
- All tests should be run in sequence for dependent features
- Reset database between full test runs
- Check server logs for detailed error information
