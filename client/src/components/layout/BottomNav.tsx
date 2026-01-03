import { NavLink } from 'react-router-dom';
import { Home, Flame, Heart, Trophy, Gamepad2 } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/feed', icon: Flame, label: 'Trade' },
  { to: '/games', icon: Gamepad2, label: 'Games' },
  { to: '/matches', icon: Heart, label: 'Matches' },
  { to: '/leaderboard', icon: Trophy, label: 'Ranks' },
];

export default function BottomNav() {
  return (
    <nav className="flex-shrink-0 bg-dark-100 border-t border-white/10 px-4 py-2 pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-white/50 hover:text-white/80'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]' : ''}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
