/**
 * TasksPage - Earn More $LOVE
 * Daily tasks and missions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  CheckCircle,
  Circle,
  Coins,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Star,
  Target,
} from 'lucide-react';
import { api } from '../api/axiosClient';
import { haptic } from '../utils/telegram';
import { useNotifications } from '../context/NotificationContext';

interface Task {
  id: string;
  code: string;
  title: string;
  description: string;
  reward_amount: number;
  task_type: 'DAILY' | 'WEEKLY' | 'ONE_TIME' | 'ACHIEVEMENT';
  requirement_type: string;
  requirement_value: number;
  is_completed: boolean;
  current_progress: number;
}

export default function TasksPage() {
  const navigate = useNavigate();
  const { hasClaimableTask, removeClaimableTask } = useNotifications();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
    // Auto-claim daily login
    claimDailyLogin();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const res = await api.get<{ tasks: Task[] }>('/tasks');
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function claimDailyLogin() {
    try {
      const res = await api.post<{ already_claimed: boolean; reward?: number }>('/tasks/daily-login');
      if (!res.already_claimed && res.reward) {
        haptic.notification('success');
        // Reload tasks to reflect completion
        loadTasks();
      }
    } catch (err) {
      console.error('Failed to claim daily login:', err);
    }
  }

  async function claimTask(taskId: string) {
    try {
      setClaiming(taskId);
      haptic.impact('medium');
      
      await api.post(`/tasks/${taskId}/claim`);
      haptic.notification('success');
      
      // Remove from claimable set after successful claim
      removeClaimableTask(taskId);
      
      // Reload tasks
      await loadTasks();
    } catch (err: any) {
      haptic.notification('error');
      console.error('Failed to claim task:', err);
      alert((err as any).response?.data?.message || 'Failed to claim task');
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-bg p-4">
        <Loader2 className="w-12 h-12 text-neon-green animate-spin mb-4" />
        <p className="text-white/60">Loading tasks...</p>
      </div>
    );
  }

  const dailyTasks = tasks.filter(t => t.task_type === 'DAILY');
  const oneTimeTasks = tasks.filter(t => t.task_type === 'ONE_TIME');
  const weeklyTasks = tasks.filter(t => t.task_type === 'WEEKLY');

  return (
    <div className="h-full overflow-y-auto bg-dark-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Coins className="w-6 h-6 text-neon-yellow" />
              Earn $LOVE
            </h1>
            <p className="text-white/60 text-sm">Complete tasks for rewards</p>
          </div>
          <button onClick={loadTasks} className="ml-auto p-2">
            <RefreshCw className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Daily Tasks */}
        {dailyTasks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-neon-yellow" />
              Daily Tasks
            </h2>
            <div className="space-y-3">
              {dailyTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  claiming={claiming === task.id}
                  isClaimable={hasClaimableTask(task.id)}
                  onClaim={() => claimTask(task.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* One-Time Tasks */}
        {oneTimeTasks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Gift className="w-5 h-5 text-neon-green" />
              One-Time Rewards
            </h2>
            <div className="space-y-3">
              {oneTimeTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  claiming={claiming === task.id}
                  isClaimable={hasClaimableTask(task.id)}
                  onClaim={() => claimTask(task.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Weekly Tasks */}
        {weeklyTasks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-neon-purple" />
              Weekly Challenges
            </h2>
            <div className="space-y-3">
              {weeklyTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  claiming={claiming === task.id}
                  isClaimable={hasClaimableTask(task.id)}
                  onClaim={() => claimTask(task.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  claiming: boolean;
  isClaimable: boolean;
  onClaim: () => void;
}

function TaskCard({ task, claiming, isClaimable, onClaim }: TaskCardProps) {
  const progress = Math.min(task.current_progress / task.requirement_value, 1);
  const canClaim = task.current_progress >= task.requirement_value && !task.is_completed;

  return (
    <div className={`bg-dark-card rounded-xl p-4 ${task.is_completed ? 'opacity-60' : ''} ${isClaimable ? 'ring-2 ring-neon-green/70 relative' : ''}`}>
      {/* Claimable indicator dot */}
      {isClaimable && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full animate-pulse" />
      )}
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {task.is_completed ? (
            <CheckCircle className="w-6 h-6 text-neon-green" />
          ) : (
            <Circle className="w-6 h-6 text-white/30" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-white">{task.title}</h3>
            <span className="text-neon-yellow font-bold">+{task.reward_amount} $LOVE</span>
          </div>
          <p className="text-white/60 text-sm mb-2">{task.description}</p>
          
          {/* Progress bar */}
          {!task.is_completed && task.requirement_value > 1 && (
            <div className="mb-2">
              <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-neon-green to-neon-blue transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-xs text-white/40 mt-1">
                {task.current_progress} / {task.requirement_value}
              </p>
            </div>
          )}
          
          {/* Claim button */}
          {canClaim && (
            <button
              onClick={onClaim}
              disabled={claiming}
              className="btn-primary py-2 px-4 text-sm mt-2 flex items-center gap-2"
            >
              {claiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Gift className="w-4 h-4" />
              )}
              Claim Reward
            </button>
          )}
          
          {task.is_completed && (
            <span className="text-neon-green text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
