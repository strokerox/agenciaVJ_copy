import { Router } from 'express';
const router = Router();

// Temporary in-memory user store for example purposes
const users = [];

function findUserByEmail(email) {
  return users.find((user) => user.email === email);
}

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const newUser = { id: users.length + 1, name, email, password };
  users.push(newUser);

  res.status(201).json({ message: 'User registered successfully.', user: { id: newUser.id, name, email } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = findUserByEmail(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  res.json({ message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful.' });
});

export default router;
