import { Router } from 'express';
import { users } from '../db/schema';

const router = Router();

router.get('/leaderboard', (_req, res) => {
  const top = [...users.values()]
    .sort((a, b) => b.stats.rankedRating - a.stats.rankedRating)
    .slice(0, 50)
    .map(u => ({
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      rankedRating: u.stats.rankedRating,
      matchesWon: u.stats.matchesWon,
      winStreak: u.stats.winStreak,
    }));
  res.json(top);
});

export default router;
