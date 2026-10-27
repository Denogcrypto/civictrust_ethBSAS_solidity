# CivicTrust MVP — guía de inicio

## Qué está implementado

- Contratos locales de Semaphore y CivicTrust, con un padrón de compromisos de identidad.
- Creación y cierre de consultas con resultados públicos.
- Creación/importación de identidades Semaphore y exportación de una copia secreta para el vecino.
- Generación de pruebas de conocimiento cero en el navegador.
- Un voto por identidad y consulta mediante nullifier Semaphore; la transacción de voto la envía un relayer local.
- Escrutinio en blockchain sin registrar la dirección del votante en el evento de CivicTrust.
- Demo local Hardhat, interfaz en español y una consulta de ejemplo.

## Cómo funciona el flujo

1. **Administración:** la cuenta #0 de MetaMask administra el padrón y las consultas. En esta demo es una cuenta local de prueba; no representa al vecino.
2. **Credencial:** al crear una identidad, el navegador genera un secreto y su compromiso público. El archivo JSON secreto sirve para demostrar que controlás esa identidad; guardalo y no lo compartas. El compromiso es el número público que el administrador agrega al padrón; no es una dirección de MetaMask ni contiene un nombre.
3. **Padrón:** el administrador registra tres o más compromisos en Semaphore. La demo solo comprueba que una credencial está en ese grupo; no comprueba que corresponda a una persona real. Se pueden crear varias identidades de prueba desde un mismo equipo.
4. **Voto:** el vecino importa su archivo secreto, elige una opción y el navegador genera una prueba ZK de pertenencia. La prueba acredita que la identidad está en el padrón sin revelar cuál compromiso es. El alcance de la prueba corresponde a una consulta y Semaphore impide reutilizar esa identidad para votar otra vez en la misma consulta.
5. **Escrutinio:** un relayer local envía la prueba al contrato, que la valida y suma el voto. El evento público registra la consulta, el índice de la opción elegida y un nullifier, pero no la dirección del votante. La opción y los resultados son públicos; este MVP no oculta el contenido del voto.

En resumen: **MetaMask administra; el archivo secreto habilita el voto; el compromiso público sirve para inscribir la identidad; la prueba ZK permite contar el voto sin publicar qué identidad lo emitió.**

## Límites de esta demo

El padrón se administra manualmente: no hay integración con miBA, DNI ni un registro comunal real. Por eso el prototipo demuestra la pertenencia anónima a un grupo y el voto ZK, pero todavía no puede garantizar “una persona, una identidad”. El archivo de identidad es secreto: si alguien lo obtiene, puede votar con esa identidad.

El anonimato práctico depende del tamaño del padrón; el contrato exige al menos tres identidades elegibles. Las opciones y los resultados son públicos. El relayer local usa una cuenta de prueba de Hardhat y sirve para la demo; no está preparado para una red pública. La demo no integra una Layer 2, paymaster institucional ni seguimiento/liberación de fondos de obras.

La primera generación de prueba puede descargar artefactos públicos de los circuitos Semaphore y tardar un poco. Necesitás conexión a internet en ese primer voto.

## Arranque

1. En PowerShell, desde la carpeta del proyecto, instalá dependencias:

   ```powershell
   npm install
   ```

2. Iniciá el entorno completo:

   ```powershell
   npm run dev
   ```

   El comando compila, inicia Hardhat, despliega Semaphore y CivicTrust, crea una consulta de ejemplo y abre la interfaz local. Dejá la terminal abierta.

   También podés usar `npm run demo`; ambos comandos inician la misma demo local.

3. Abrí [http://127.0.0.1:4173](http://127.0.0.1:4173) en Chrome o Edge, en el perfil donde tengas instalada la extensión MetaMask. La vista previa del navegador integrado de Codex puede no tener acceso a esa extensión.

## Preparar la demo

1. En MetaMask, abrí el menú de cuentas y elegí **Agregar cuenta / Importar cuenta**. Importá la clave privada de la **cuenta #0** que imprime Hardhat en la terminal; no uses tu frase semilla personal.
2. En CivicTrust, pulsá **Administrar comuna**. Primero autorizá el acceso a la cuenta en MetaMask; después aceptá agregar o cambiar a `CivicTrust Local (Hardhat)`. La red usa RPC `http://127.0.0.1:8545`, chain ID `31337` y moneda `ETH`. El administrador local es la cuenta #0, cuya dirección termina en `2266`.
3. En **Tu identidad privada**, pulsá **Crear identidad privada** y descargá la copia secreta. Compartí únicamente el compromiso público que aparece en pantalla.
4. En **Administrar padrón y consultas**, pegá ese compromiso y agregalo. Repetí el proceso hasta registrar al menos tres identidades distintas.
5. Importá en la aplicación el archivo secreto de una de esas identidades. La interfaz indicará si está habilitada en el padrón.
6. Elegí una opción y pulsá **Votar anónimamente**. La prueba se genera en el navegador y el relayer local envía la transacción; el vecino no necesita conectar MetaMask ni pagar gas en esta demo.

Si MetaMask no logra conectarse, confirmá que la terminal siga ejecutando `npm run demo` y que estés usando el perfil del navegador con la extensión instalada. No uses esta red ni las claves de Hardhat para operar en una red pública.

Para comprobar identidades distintas, importá cada archivo secreto por turno y votá una sola vez por identidad en la consulta. Si intentás reutilizar una identidad en esa misma consulta, Semaphore rechazará el nullifier repetido.

**Seguridad:** las claves privadas que imprime Hardhat son públicas y determinísticas. Usalas solo en esta red local; nunca envíes fondos reales ni las importes en una red pública. No compartas el archivo `civictrust-identidad-privada.json`.

## Detener y reiniciar

Pulsá `Ctrl+C` en la terminal de `npm run demo`. Al volver a ejecutarlo se crea una blockchain vacía, se despliegan contratos nuevos y la consulta anterior desaparece. Conservá tus copias secretas si querés volver a registrar las mismas identidades.

## Comandos útiles

```powershell
npm run compile
```

Compila CivicTrust y los contratos Semaphore sin iniciar la aplicación.

## Próximas etapas

1. Conectar un flujo real de identidad/eligibilidad con el gobierno y limitar el registro duplicado de personas.
2. Evaluar un relayer de producción con mitigación de spam, monitoreo y protección de metadatos.
3. Desplegar y revisar contratos para una testnet y luego una Layer 2.
4. Diseñar la trazabilidad de presupuesto y pagos por hitos de obra.
