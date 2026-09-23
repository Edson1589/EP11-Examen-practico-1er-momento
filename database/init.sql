CREATE TABLE IF NOT EXISTS marcaciones (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_empleado VARCHAR(30) NOT NULL CHECK (LENGTH(TRIM(codigo_empleado)) > 0),
    nombre_empleado VARCHAR(120) NOT NULL CHECK (LENGTH(TRIM(nombre_empleado)) > 0),
    fecha DATE NOT NULL,
    hora_ingreso_programada TIME NOT NULL,
    hora_ingreso_real TIME,
    hora_salida_programada TIME NOT NULL,
    hora_salida_real TIME,
    estado VARCHAR(10) NOT NULL CHECK (estado IN ('PUNTUAL', 'ATRASO', 'INCOMPLETO')),
    observacion VARCHAR(500) NOT NULL DEFAULT '',
    CHECK (hora_salida_programada >= hora_ingreso_programada),
    CHECK (hora_salida_real IS NULL OR (hora_ingreso_real IS NOT NULL AND hora_salida_real >= hora_ingreso_real))
);

CREATE INDEX IF NOT EXISTS indice_marcaciones_empleado ON marcaciones (codigo_empleado);
CREATE INDEX IF NOT EXISTS indice_marcaciones_fecha ON marcaciones (fecha);
