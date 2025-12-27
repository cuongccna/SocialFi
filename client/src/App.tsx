import { Routes, Route } from 'react-router-dom';
import { useAuth, AuthLoadingScreen, AuthErrorScreen } from './context/AuthContext';

// Pages
import HomePage from './pages/HomePage';
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

// Layout
import BottomNav from './components/layout/BottomNav';

function App() {
  const { user, isLoading, isAuthenticated, error } = useAuth();

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
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
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
        </Routes>
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}

export default App;
