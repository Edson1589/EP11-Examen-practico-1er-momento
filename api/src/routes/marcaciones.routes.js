const express = require('express');
const { pool } = require('../config/db');
const { validarMarcacion, validarFecha, validarTexto } = require('../validaciones');

const rutas = express.Router();

rutas.param('id', (req, res, next, id) => {
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    return res.status(400).json({ error: 'El identificador debe ser un entero positivo válido.' });
  }
  next();
});

rutas.get('/', async (req, res) => {
  const condiciones = [];
  const valores = [];

  if (req.query.empleado !== undefined) {
    valores.push(validarTexto(req.query.empleado, 'El código de empleado', 30).toUpperCase());
    condiciones.push(`codigo_empleado = $${valores.length}`);
  }

  if (req.query.fecha !== undefined) {
    valores.push(validarFecha(req.query.fecha));
    condiciones.push(`fecha = $${valores.length}`);
  }

  const filtro = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const resultado = await pool.query(`SELECT * FROM marcaciones ${filtro} ORDER BY fecha DESC, id DESC`, valores);

  res.json(resultado.rows);
});

rutas.get('/:id', async (req, res) => {
  const resultado = await pool.query('SELECT * FROM marcaciones WHERE id = $1', [req.params.id]);
  if (!resultado.rowCount) {
    return res.status(404).json({ error: 'La marcación no existe.' });
  }
  res.json(resultado.rows[0]);
});

rutas.post('/', async (req, res) => {
  const datos = validarMarcacion(req.body);
  const resultado = await pool.query(
    `INSERT INTO marcaciones (
      codigo_empleado, nombre_empleado, fecha, hora_ingreso_programada,
      hora_ingreso_real, hora_salida_programada, hora_salida_real, estado, observacion
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    valoresMarcacion(datos),
  );
  res.location(`/api/marcaciones/${resultado.rows[0].id}`).status(201).json(resultado.rows[0]);
});

rutas.put('/:id', async (req, res) => {
  const datos = validarMarcacion(req.body);
  const resultado = await pool.query(
    `UPDATE marcaciones SET
      codigo_empleado = $1, nombre_empleado = $2, fecha = $3,
      hora_ingreso_programada = $4, hora_ingreso_real = $5,
      hora_salida_programada = $6, hora_salida_real = $7, estado = $8, observacion = $9
    WHERE id = $10 RETURNING *`,
    [...valoresMarcacion(datos), req.params.id],
  );
  if (!resultado.rowCount) {
    return res.status(404).json({ error: 'La marcación no existe.' });
  }
  res.json(resultado.rows[0]);
});

rutas.delete('/:id', async (req, res) => {
  const resultado = await pool.query('DELETE FROM marcaciones WHERE id = $1 RETURNING id', [req.params.id]);
  if (!resultado.rowCount) {
    return res.status(404).json({ error: 'La marcación no existe.' });
  }
  res.json({ mensaje: 'Marcación eliminada correctamente.' });
});

function valoresMarcacion(datos) {
  return [
    datos.codigo_empleado, datos.nombre_empleado, datos.fecha,
    datos.hora_ingreso_programada, datos.hora_ingreso_real,
    datos.hora_salida_programada, datos.hora_salida_real, datos.estado, datos.observacion,
  ];
}

module.exports = rutas;
