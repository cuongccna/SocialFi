import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, AuthLoadingScreen, AuthErrorScreen } from './context/AuthContext';
import { parseDeepLink } from './utils/telegram';
import { api } from './api/axiosClient';

// Pages
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import MatchesPage from './pages/MatchesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MarketsPage from './pages/MarketsPage';
import ChatPage from './pages/ChatPage';
import JuryPage from './pages/JuryPage';
import TasksPage from './pages/TasksPage';
import ReferralsPage from './pages/ReferralsPage';
import WalletPage from './pages/WalletPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import GameHubPage from './pages/GameHubPage';
import GameLeaderboardPage from './pages/GameLeaderboardPage';
import KYPGamePage from './pages/KYPGamePage';
import MiningGamePage from './pages/MiningGamePage';
import CandleKissPage from './pages/CandleKissPage';
import EarnHub from './pages/EarnHub';
import NotificationsPage from './pages/NotificationsPage';
import DecorShopPage from './pages/DecorShopPage';

// Layout
import BottomNav from './components/layout/BottomNav';

// Global Components
import GlobalNotification from './components/GlobalNotification';

function App() {
  const { isLoading, isAuthenticated, error } = useAuth();
  const navigate = useNavigate();

  // Handle Telegram deep links (startapp parameter)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const deepLink = parseDeepLink();
    if (!deepLink) return;
    
    console.log('📱 Deep link detected:', deepLink);
    
    switch (deepLink.action) {
      case 'ref':
        // Referral link - apply referral code via API
        api.post('/referrals/apply', { referral_code: deepLink.value })
          .then(() => console.log('✅ Referral code applied:', deepLink.value))
          .catch((err) => console.log('📎 Referral code not applied:', err.message));
        break;
      case 'game':
        // Game invite - navigate to the appropriate game
        navigate(`/games/kyp?session=${deepLink.value}`);
        break;
      case 'chat':
        // Chat deep link - navigate to chat
        navigate(`/chat?relationship_id=${deepLink.value}`);
        break;
      default:
        console.log('Unknown deep link action:', deepLink.action);
    }
  }, [isAuthenticated, navigate]);

  // Note: Telegram WebApp viewport setup is handled in main.tsx via initTelegramWebApp()
  // This includes: disableVerticalSwipes, viewport height CSS vars, and viewportChanged listener

  // Show loading screen while authenticating
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Show error screen if authentication failed
  if (error && !isAuthenticated) {
    return (
      <AuthErrorScreen 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark">
      {/* Global Notifications (Game Invites, etc.) */}
      <GlobalNotification />
      
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Routes>
          {/* Default redirect to Feed (Explore tab) */}
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/jury" element={<JuryPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/games" element={<GameHubPage />} />
          <Route path="/games/leaderboard" element={<GameLeaderboardPage />} />
          <Route path="/games/kyp" element={<KYPGamePage />} />
          <Route path="/games/mining" element={<MiningGamePage />} />
          <Route path="/games/candle" element={<CandleKissPage />} />
          <Route path="/earn" element={<EarnHub />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/shop" element={<DecorShopPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}

export default App;
