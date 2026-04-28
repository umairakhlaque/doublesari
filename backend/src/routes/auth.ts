import { Router } from 'express';
import { users } from '../db/schema';

const router = Router();

router.get('/profile/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { ...safe } = user;
  res.json(safe);
});

router.patch('/profile/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { displayName } = req.body;
  if (displayName && typeof displayName === 'string') {
    user.displayName = displayName.slice(0, 30);
  }
  res.json(user);
});

export default router;
