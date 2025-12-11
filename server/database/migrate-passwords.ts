import { db } from './db.js';
import bcrypt from 'bcryptjs';

/**
 * Migración: Actualizar contraseñas a bcrypt hash
 * Esta función verifica si las contraseñas están hasheadas con bcrypt.
 * Si no lo están, las actualiza usando los primeros 4 dígitos del RUT.
 */
export async function migratePasswordsToBcrypt() {
  try {
    console.log('🔄 Verificando contraseñas...');

    const users = db.sqlite.prepare('SELECT id, rut, password FROM users').all() as any[];

    let migrated = 0;

    for (const user of users) {
      // Verificar si la contraseña ya está hasheada con bcrypt
      // Los hashes de bcrypt siempre comienzan con "$2a$", "$2b$" o "$2y$"
      const isBcryptHash = /^\$2[aby]\$\d+\$/.test(user.password);

      if (!isBcryptHash) {
        // La contraseña NO está hasheada, necesitamos migrarla
        // Extraer primeros 4 dígitos del RUT como contraseña
        const cleanedRut = user.rut.replace(/\./g, '').replace(/-/g, '');
        const first4Digits = cleanedRut.substring(0, 4);

        // Hashear la contraseña
        const hashedPassword = bcrypt.hashSync(first4Digits, 10);

        // Actualizar en la base de datos
        db.sqlite.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

        console.log(`✅ Usuario ${user.rut} migrado (contraseña: ${first4Digits})`);
        migrated++;
      }
    }

    if (migrated > 0) {
      console.log(`✅ ${migrated} contraseña(s) migrada(s) a bcrypt`);
    } else {
      console.log('✅ Todas las contraseñas ya están hasheadas con bcrypt');
    }
  } catch (error) {
    console.error('❌ Error migrando contraseñas:', error);
  }
}
