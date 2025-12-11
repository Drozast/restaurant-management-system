import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';

const router = Router();

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Función para formatear RUT (eliminar puntos y guiones)
function cleanRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '');
}

// Función para obtener primeros 4 dígitos del RUT
function getFirst4Digits(rut: string): string {
  const cleaned = cleanRut(rut);
  return cleaned.substring(0, 4);
}

// POST login (with rate limiting)
router.post('/login', loginLimiter, (req: Request, res: Response) => {
  try {
    const { rut, password } = req.body;

    if (!rut || !password) {
      return res.status(400).json({ error: 'RUT y contraseña son requeridos' });
    }

    const cleanedRut = cleanRut(rut);

    // Buscar usuario
    const user = db.sqlite.prepare(`
      SELECT * FROM users WHERE REPLACE(REPLACE(rut, '.', ''), '-', '') = ? AND active = 1
    `).get(cleanedRut);

    if (!user) {
      return res.status(401).json({ error: 'RUT o contraseña incorrectos' });
    }

    // Verificar contraseña
    const isValidPassword = bcrypt.compareSync(password, (user as any).password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'RUT o contraseña incorrectos' });
    }

    // Actualizar último login
    db.sqlite.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).run((user as any).id);

    // Retornar datos del usuario (sin contraseña)
    const { password: _, ...userData } = user as any;

    res.json({
      user: userData,
      message: 'Login exitoso'
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// POST logout
router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logout exitoso' });
});

// GET current user (verificar sesión)
router.get('/me', (req: Request, res: Response) => {
  // Por ahora retornamos null, esto se implementará con sesiones/JWT más adelante
  res.json({ user: null });
});

// GET all users (solo para chef/admin)
router.get('/users', (req: Request, res: Response) => {
  try {
    const users = db.sqlite.prepare(`
      SELECT id, rut, name, role, active, created_at, last_login
      FROM users
      ORDER BY role DESC, name
    `).all();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST create user (solo para chef/admin)
router.post('/users', (req: Request, res: Response) => {
  try {
    const { rut, name, role } = req.body;

    if (!rut || !name || !role) {
      return res.status(400).json({ error: 'RUT, nombre y rol son requeridos' });
    }

    const cleanedRut = cleanRut(rut);
    const password = getFirst4Digits(cleanedRut);
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Verificar si el RUT ya existe
    const existing = db.sqlite.prepare(`
      SELECT * FROM users WHERE REPLACE(REPLACE(rut, '.', ''), '-', '') = ?
    `).get(cleanedRut);

    if (existing) {
      return res.status(400).json({ error: 'El RUT ya está registrado' });
    }

    // Formatear RUT para mostrar (con guión)
    const formattedRut = cleanedRut.slice(0, -1) + '-' + cleanedRut.slice(-1);

    const stmt = db.sqlite.prepare(`
      INSERT INTO users (rut, password, name, role)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(formattedRut, hashedPassword, name, role);

    const newUser = db.sqlite.prepare(`
      SELECT id, rut, name, role, active, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Error creando usuario:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'El RUT ya existe' });
    } else {
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
});

// PUT update user
router.put('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, active } = req.body;

    const stmt = db.sqlite.prepare(`
      UPDATE users
      SET name = ?, role = ?, active = ?
      WHERE id = ?
    `);

    stmt.run(name, role, active, id);

    const updated = db.sqlite.prepare(`
      SELECT id, rut, name, role, active, created_at, last_login
      FROM users WHERE id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE user (soft delete)
router.delete('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // No permitir eliminar el admin principal
    const user = db.sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (user && user.rut === '11111111-1') {
      return res.status(400).json({ error: 'No se puede eliminar el usuario administrador principal' });
    }

    const stmt = db.sqlite.prepare('UPDATE users SET active = 0 WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Usuario desactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// POST reset password (resetear a primeros 4 dígitos del RUT)
router.post('/users/:id/reset-password', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = db.sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const cleanedRut = cleanRut(user.rut);
    const newPassword = getFirst4Digits(cleanedRut);
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    db.sqlite.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);

    res.json({ message: 'Contraseña reseteada a los primeros 4 dígitos del RUT' });
  } catch (error) {
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
});

export default router;
