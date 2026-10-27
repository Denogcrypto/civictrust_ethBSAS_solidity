# Guía de usuario de CivicTrust

## Qué hace

CivicTrust permite que vecinos habilitados participen en una consulta de presupuesto comunal. El voto se cuenta en una blockchain local y usa pruebas de conocimiento cero para comprobar que la credencial pertenece al padrón sin publicar la identidad que votó.

Esta versión es una demo educativa: no está conectada con miBA, DNI ni un padrón municipal real.

## Iniciar la demo

1. Abrí PowerShell o una terminal en la carpeta del proyecto.
2. Ejecutá:

   ```powershell
   npm run dev
   ```

3. Dejá esa terminal abierta y visitá [http://127.0.0.1:4173](http://127.0.0.1:4173).

El comando `npm run demo` inicia el mismo entorno. Al detenerlo con `Ctrl+C` y volver a iniciarlo, la blockchain local se reinicia y se pierden los votos y el padrón de esa sesión.

## Preparar el padrón como administrador

La cuenta administradora solo se usa para inscribir compromisos y gestionar consultas. En esta demo es la cuenta de prueba #0 de Hardhat; nunca la uses en una red real ni le envíes fondos reales.

1. Abrí CivicTrust en Chrome o Edge con MetaMask habilitada. La vista integrada de Codex puede no tener acceso a MetaMask.
2. En MetaMask, seleccioná la cuenta local de prueba #0 y pulsá **Administrar comuna**.
3. Autorizá el acceso a la cuenta y aceptá agregar o cambiar a **CivicTrust Local (Hardhat)**.
4. En **Tu identidad privada**, pulsá **Crear identidad privada**. Descargá el archivo secreto y anotá el **Compromiso público** que aparece.
5. Repetí el paso anterior para generar al menos tres identidades distintas. Conservá cada archivo y cada compromiso por separado.
6. En el panel **Administrar padrón y consultas**, buscá **Compromisos públicos**. Pegá los tres compromisos numéricos, uno por línea; no pegues direcciones de MetaMask (`0x...`) ni archivos secretos.
7. Pulsá **Agregar al padrón** y confirmá la transacción en MetaMask. El contador debe reflejar las identidades agregadas.

## Votar como vecino

1. En **Prepará tu credencial de voto**, pulsá **Importar credencial** y elegí uno de los archivos JSON que guardaste.
2. Verificá que CivicTrust indique **Credencial lista**. Si no aparece, confirmá que registraste el compromiso correspondiente a ese archivo.
3. En la consulta abierta, elegí una propuesta y pulsá **Votar anónimamente**.
4. Esperá a que se genere y valide la prueba ZK. En el primer voto puede tardar un poco mientras se descargan los archivos públicos del circuito. No cierres la página.
5. Cuando la transacción local se confirme, el total y el resultado de la opción se actualizarán.

El vecino no conecta MetaMask ni paga gas para votar en esta demo. Un relayer local envía la prueba al contrato.

## Qué significan los términos

- **Archivo secreto:** contiene la credencial de voto. Quien lo tenga puede votar con ella; no lo compartas.
- **Compromiso público:** número que el administrador agrega al padrón. No es una dirección de wallet ni un nombre.
- **Prueba ZK:** permite demostrar que la credencial está habilitada sin revelar cuál compromiso del padrón corresponde al voto.
- **MetaMask:** autoriza las acciones de administración en la blockchain local; no identifica al vecino que vota.

## Alcance y límites

- El contrato permite un voto por credencial en cada consulta. El padrón manual no impide que una persona genere y registre varias credenciales; por eso este MVP no garantiza todavía “un vecino, un voto”.
- Se necesitan al menos tres credenciales para habilitar el voto anónimo práctico en la demo.
- Las opciones y los resultados son públicos. El evento del voto registra la consulta, la opción y un nullifier, pero no la dirección del votante.
- No están implementados el inicio de sesión miBA, la validación de residencia, una integración con RENAPER, pagos de obras ni una red Layer 2.

## Solución de problemas

- **MetaMask no está disponible:** abrí CivicTrust en el perfil de Chrome o Edge donde tenés la extensión.
- **MetaMask indica que una solicitud no está autorizada:** actualizá la página con `Ctrl+F5` y volvé a pulsar **Administrar comuna**; primero autorizá la cuenta y después la red local.
- **No aparece el panel de padrón:** asegurate de que el botón superior muestre **Admin** con la cuenta que termina en `2266`, y desplazate debajo de la consulta.
- **La credencial no está habilitada:** importá el archivo cuyo compromiso público agregaste al padrón.
- **La página no responde:** comprobá que la terminal de `npm run dev` siga abierta. Si la cerraste, ejecutá el comando otra vez.

