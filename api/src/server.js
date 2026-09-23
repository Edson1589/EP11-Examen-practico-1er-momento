require('dotenv').config({ quiet: true });

const express = require('express');
const { pool } = require('./config/db');
const rutasMarcaciones = require('./routes/marcaciones.routes');

const aplicacion = express();
const puerto = Number(process.env.API_PORT) || 3000;

aplicacion.disable('x-powered-by');
aplicacion.use(express.json({ limit: '16kb' }));
aplicacion.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

aplicacion.get(['/api/health'], async (_req, res) => {
  try {
    await pool.query('SELECT id FROM marcaciones LIMIT 0');
    res.json({ estado: 'saludable', base_de_datos: 'disponible' });
  } catch {
    res.status(503).json({ estado: 'no disponible', error: 'No se puede acceder a la base de datos.' });
  }
});

aplicacion.use('/api/marcaciones', rutasMarcaciones);
aplicacion.use((_req, res) => { res.status(404).json({ error: 'La ruta solicitada no existe.' }) });

aplicacion.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud debe ser JSON válido.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud supera el tamaño permitido.' });
  }
  if (error.status === 400) {
    return res.status(400).json({ error: error.message });
  }

  console.error('No se pudo procesar la solicitud:', error.code || 'error interno');
  res.status(500).json({ error: 'No se pudo completar la operación. Intenta nuevamente.' });
});

async function iniciar() {
  try {
    for (const variable of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
      if (!process.env[variable]) {
        throw new Error(`Falta configurar ${variable}.`);
      }
    }
    await pool.query('SELECT id FROM marcaciones LIMIT 0');
    const servidor = aplicacion.listen(puerto, '0.0.0.0', () => {
      console.log(`API de marcaciones disponible en el puerto ${puerto}.`);
    });

    process.on('SIGTERM', () => {
      servidor.close(async () => {
        await pool.end();
        process.exit(0);
      });
    });
  } catch {
    console.error('No se pudo iniciar la API. Revisa las variables de entorno y PostgreSQL.');
    process.exit(1);
  }
}

iniciar();
