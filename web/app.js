const formulario = document.querySelector('#formulario-marcacion');
const filtros = document.querySelector('#formulario-filtros');
const cuerpoTabla = document.querySelector('#registros');
const mensaje = document.querySelector('#mensaje');
const estadoConsulta = document.querySelector('#estado-consulta');
const tituloFormulario = document.querySelector('#titulo-formulario');
const botonGuardar = document.querySelector('#guardar');
const botonCancelar = document.querySelector('#cancelar');
const etiquetas = { PUNTUAL: 'Puntual', ATRASO: 'Atraso', INCOMPLETO: 'Incompleto' };
let idEdicion = null;
let ocupado = false;

function mostrarMensaje(texto, esError = false) {
  mensaje.textContent = texto;
  mensaje.className = esError ? 'mensaje error' : 'mensaje';
  mensaje.hidden = false;
}

async function solicitar(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      ...opciones,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('No se pudo conectar con la API. Intenta actualizar los registros.');
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(datos?.error || 'El servicio no está disponible. Intenta nuevamente.');
  }
  if (datos === null) {
    throw new Error('La API devolvió una respuesta no válida.');
  }
  return datos;
}

async function ejecutar(accion) {
  if (ocupado) return;
  ocupado = true;
  mensaje.hidden = true;
  document.querySelectorAll('button').forEach((boton) => { boton.disabled = true; });
  try {
    await accion();
  } catch (error) {
    mostrarMensaje(error.message, true);
  } finally {
    ocupado = false;
    document.querySelectorAll('button').forEach((boton) => { boton.disabled = false; });
  }
}

function crearTexto(etiqueta, texto, clase = '') {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  elemento.className = clase;
  return elemento;
}

function mostrarFilaVacia(texto) {
  const fila = document.createElement('tr');
  const celda = crearTexto('td', texto, 'vacio');
  celda.colSpan = 8;
  fila.append(celda);
  cuerpoTabla.replaceChildren(fila);
}

function celdaHorario(real, programada) {
  const celda = document.createElement('td');
  celda.append(crearTexto('strong', real || 'Pendiente'), crearTexto('small', `Prog. ${programada}`));
  return celda;
}

function mostrarRegistros(registros) {
  document.querySelector('#total').textContent = registros.length;
  for (const [id, estado] of [['puntuales', 'PUNTUAL'], ['atrasos', 'ATRASO'], ['incompletos', 'INCOMPLETO']]) {
    document.getElementById(id).textContent = registros.filter((registro) => registro.estado === estado).length;
  }

  cuerpoTabla.replaceChildren();
  if (!registros.length) {
    mostrarFilaVacia('No hay marcaciones para mostrar. Registra una nueva o cambia los filtros.');
    return;
  }

  for (const registro of registros) {
    const fila = document.createElement('tr');
    const empleado = document.createElement('td');
    empleado.className = 'nombre-empleado';
    empleado.append(crearTexto('strong', registro.nombre_empleado), crearTexto('small', registro.codigo_empleado));
    const estado = document.createElement('td');
    estado.append(crearTexto('span', etiquetas[registro.estado], `insignia ${registro.estado.toLowerCase()}`));
    const acciones = document.createElement('td');
    const botones = document.createElement('div');
    botones.className = 'acciones';
    for (const [texto, clase, accion] of [
      ['Editar', 'accion', () => editar(registro.id)],
      ['Eliminar', 'accion eliminar', () => eliminar(registro)],
    ]) {
      const boton = crearTexto('button', texto, clase);
      boton.type = 'button';
      boton.disabled = ocupado;
      boton.setAttribute('aria-label', `${texto} marcación ${registro.id} de ${registro.nombre_empleado}`);
      boton.addEventListener('click', () => ejecutar(accion));
      botones.append(boton);
    }
    acciones.append(botones);
    fila.append(
      crearTexto('td', `#${registro.id}`),
      empleado,
      crearTexto('td', registro.fecha.split('-').reverse().join('/'), 'fecha-registro'),
      celdaHorario(registro.hora_ingreso_real, registro.hora_ingreso_programada),
      celdaHorario(registro.hora_salida_real, registro.hora_salida_programada),
      estado,
      crearTexto('td', registro.observacion || '—', 'observacion'),
      acciones,
    );
    cuerpoTabla.append(fila);
  }
}

async function cargarMarcaciones() {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of new FormData(filtros)) {
    if (valor.trim()) parametros.set(clave, valor.trim());
  }
  estadoConsulta.textContent = 'Actualizando…';
  estadoConsulta.dataset.estado = 'cargando';
  try {
    const registros = await solicitar(`/marcaciones?${parametros}`);
    mostrarRegistros(registros);
    estadoConsulta.textContent = 'Consulta actualizada';
    estadoConsulta.dataset.estado = 'listo';
  } catch (error) {
    estadoConsulta.textContent = 'Consulta no disponible';
    estadoConsulta.dataset.estado = 'error';
    mostrarFilaVacia('No se pudieron cargar los registros. Intenta actualizar nuevamente.');
    for (const id of ['total', 'puntuales', 'atrasos', 'incompletos']) {
      document.getElementById(id).textContent = '—';
    }
    throw error;
  }
}

function reiniciarFormulario() {
  formulario.reset();
  const hoy = new Date();
  formulario.elements.fecha.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  idEdicion = null;
  tituloFormulario.textContent = 'Nueva marcación';
  botonGuardar.textContent = 'Guardar marcación';
  botonCancelar.hidden = true;
}

async function editar(id) {
  const registro = await solicitar(`/marcaciones/${id}`);
  for (const elemento of formulario.elements) {
    if (elemento.name) elemento.value = registro[elemento.name] ?? '';
  }
  idEdicion = id;
  tituloFormulario.textContent = `Editar marcación #${id}`;
  botonGuardar.textContent = 'Guardar cambios';
  botonCancelar.hidden = false;
  formulario.elements.codigo_empleado.focus();
  tituloFormulario.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

async function actualizarTrasCambio(texto) {
  try {
    await cargarMarcaciones();
    mostrarMensaje(texto);
  } catch (error) {
    mostrarMensaje(`${texto} No se pudo actualizar la lista: ${error.message}`, true);
  }
}

async function eliminar(registro) {
  if (!window.confirm(`¿Eliminar la marcación #${registro.id} de ${registro.nombre_empleado}?`)) return;
  await solicitar(`/marcaciones/${registro.id}`, { method: 'DELETE' });
  if (idEdicion === registro.id) reiniciarFormulario();
  await actualizarTrasCambio('Marcación eliminada correctamente.');
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  ejecutar(async () => {
    const datos = Object.fromEntries(new FormData(formulario));
    const enEdicion = idEdicion !== null;
    await solicitar(enEdicion ? `/marcaciones/${idEdicion}` : '/marcaciones', {
      method: enEdicion ? 'PUT' : 'POST',
      body: JSON.stringify(datos),
    });
    reiniciarFormulario();
    filtros.reset();
    await actualizarTrasCambio(enEdicion ? 'Marcación actualizada correctamente.' : 'Marcación registrada correctamente.');
  });
});

filtros.addEventListener('submit', (evento) => {
  evento.preventDefault();
  ejecutar(cargarMarcaciones);
});

document.querySelector('#limpiar').addEventListener('click', () => {
  filtros.reset();
  ejecutar(cargarMarcaciones);
});

document.querySelector('#actualizar').addEventListener('click', () => ejecutar(cargarMarcaciones));
botonCancelar.addEventListener('click', reiniciarFormulario);

reiniciarFormulario();
ejecutar(cargarMarcaciones);
