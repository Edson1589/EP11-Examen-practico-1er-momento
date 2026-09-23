function rechazar(mensaje) {
  const error = new Error(mensaje);
  error.status = 400;
  throw error;
}

function validarFecha(valor) {
  if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) {
    rechazar('La fecha es obligatoria y debe usar el formato AAAA-MM-DD.');
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
    rechazar('La fecha no es válida.');
  }

  return valor;
}

function validarTexto(valor, nombre, maximo) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > maximo) {
    rechazar(`${nombre} es obligatorio y debe tener como máximo ${maximo} caracteres.`);
  }

  return valor.trim();
}

function validarHora(valor, nombre, opcional = false) {
  if (opcional && (valor === null || valor === undefined || valor === '')) {
    return null;
  }

  if (typeof valor !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) {
    rechazar(`${nombre} debe usar el formato HH:MM entre 00:00 y 23:59.`);
  }

  return valor;
}

function validarMarcacion(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    rechazar('Envía un objeto JSON con los datos de la marcación.');
  }

  const marcacion = {
    codigo_empleado: validarTexto(datos.codigo_empleado, 'El código de empleado', 30).toUpperCase(),
    nombre_empleado: validarTexto(datos.nombre_empleado, 'El nombre del empleado', 120),
    fecha: validarFecha(datos.fecha),
    hora_ingreso_programada: validarHora(datos.hora_ingreso_programada, 'La hora programada de ingreso'),
    hora_ingreso_real: validarHora(datos.hora_ingreso_real, 'La hora real de ingreso', true),
    hora_salida_programada: validarHora(datos.hora_salida_programada, 'La hora programada de salida'),
    hora_salida_real: validarHora(datos.hora_salida_real, 'La hora real de salida', true),
    observacion: datos.observacion ?? '',
  };

  if (typeof marcacion.observacion !== 'string' || marcacion.observacion.trim().length > 500) {
    rechazar('La observación debe ser un texto de hasta 500 caracteres.');
  }
  marcacion.observacion = marcacion.observacion.trim();

  if (marcacion.hora_salida_programada < marcacion.hora_ingreso_programada) {
    rechazar('La salida programada no puede ser anterior al ingreso programado.');
  }

  if (marcacion.hora_salida_real && !marcacion.hora_ingreso_real) {
    rechazar('Registra el ingreso real antes de registrar la salida real.');
  }

  if (marcacion.hora_salida_real && marcacion.hora_salida_real < marcacion.hora_ingreso_real) {
    rechazar('La salida real no puede ser anterior al ingreso real.');
  }

  marcacion.estado = !marcacion.hora_ingreso_real || !marcacion.hora_salida_real
    ? 'INCOMPLETO'
    : marcacion.hora_ingreso_real > marcacion.hora_ingreso_programada ? 'ATRASO' : 'PUNTUAL';

  return marcacion;
}

module.exports = { validarMarcacion, validarFecha, validarTexto };
