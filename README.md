# EP11 · Gestión de marcaciones

En esta práctica desarrollé una aplicación para registrar, consultar, editar y eliminar marcaciones de empleados. También agregué filtros por código de empleado y fecha.

## Arquitectura

Organicé el proyecto en tres contenedores: **web** (HTML, CSS y JavaScript con Nginx), **api** (Node.js y Express) y **database** (PostgreSQL).

Conecté los contenedores mediante la red Docker `red_rrhh` y publiqué únicamente el puerto de la web. La web consume la API y la API accede a PostgreSQL usando `database:5432`. Utilicé el nombre del servicio porque `localhost` apuntaría al propio contenedor de la API.

## Ejecutar

Para ejecutar el proyecto, primero inicio Docker Desktop con contenedores Linux. Luego, desde la raíz del proyecto, copio la configuración de ejemplo en PowerShell:

```powershell
Copy-Item .env.example .env
```

Completo `DB_PASSWORD` en `.env` y mantengo los demás valores del ejemplo. Usé variables de entorno para las credenciales y excluí `.env` de Git. Después inicio los servicios:

```powershell
docker compose up -d
```

Abro la aplicación en http://localhost:8080. Cuando modifico el código, reconstruyo las imágenes con `docker compose up -d --build`.

## Uso y CRUD

Desde el formulario registro una marcación y desde la tabla puedo consultar, editar, eliminar y filtrar los registros. En la API agregué validaciones para los campos obligatorios, las fechas y las horas, incluyendo que la salida no sea anterior al ingreso.

El cálculo del estado lo realicé en el backend: **INCOMPLETO** si falta una hora real; con ambas horas registradas, **ATRASO** si el ingreso real supera al programado y **PUNTUAL** en caso contrario.

## API

Implementé estas rutas, disponibles desde `http://localhost:8080`:

| Método | Ruta | Operación |
| --- | --- | --- |
| GET | /api/marcaciones | Listar; admite `?empleado=EMP001` y `?fecha=2026-09-23` |
| GET | /api/marcaciones/:id | Consultar una marcación |
| POST | /api/marcaciones | Registrar |
| PUT | /api/marcaciones/:id | Reemplazar los datos |
| DELETE | /api/marcaciones/:id | Eliminar |
| GET | /api/health | Comprobar API y base de datos |

## Ejecución y health check

Para revisar el estado de los contenedores, utilizo:

```powershell
docker ps
docker compose ps
```

Compruebo que aparezcan los tres servicios y que `database` y `api` estén en estado `healthy`. Configuré la API para que espere a que PostgreSQL esté disponible antes de iniciar. También puedo revisar su estado en http://localhost:8080/api/health.

## Persistencia

Usé `database/init.sql` para crear la tabla y el volumen `datos_postgres` para conservar los registros. Para comprobar la persistencia, registro una marcación y luego elimino y recreo únicamente el contenedor de PostgreSQL:

```powershell
docker compose stop database
docker compose rm -f database
docker compose up -d database
```

Cuando PostgreSQL vuelve a estar saludable, actualizo la web y compruebo que la marcación siga disponible.

## Recuperación ante falla

Para simular una falla, detengo únicamente la API:

```powershell
docker compose stop api
```

La web sigue abriendo, pero al actualizar los registros muestra un error porque la API está detenida. PostgreSQL conserva los datos. Para recuperar el servicio, ejecuto:

```powershell
docker compose start api
```

Espero a que la API esté saludable y actualizo la web para comprobar que las operaciones vuelvan a funcionar.

Cuando termino, puedo detener todo con `docker compose down` y conservar los datos. No agrego `-v`, porque esa opción elimina el volumen.
