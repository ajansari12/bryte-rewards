export interface Recognition {
  _id?: string;
  sender: string;
  senderRole: string;
  recipient: string;
  value: string;
  message: string;
  points: number;
  time: string;
  type: 'public' | 'private' | 'milestone' | 'spotlight';
  reactions: Record<string, number>;
}

export interface Notification {
  id: number;
  type: 'received' | 'reaction' | 'badge' | 'milestone' | 'comment' | 'approval';
  msg: string;
  sub: string;
  time: string;
  read: boolean;
}

export interface Toast {
  id: number;
  kind?: 'success' | 'error' | 'info';
  msg: string;
}

export type Route = 'feed' | 'profile' | 'notifications' | 'leaderboard' | 'badges' | 'rewards' | 'manager' | 'analytics' | 'admin' | 'mobile';
export type Screen = 'login' | 'signup' | 'onboarding' | 'app';
export type Theme = 'light' | 'dark';
export type Industry = 'healthcare' | 'construction' | 'retail' | 'technology' | 'hospitality' | 'financial';
