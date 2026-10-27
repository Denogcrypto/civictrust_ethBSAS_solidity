# CivicTrust

## Whitepaper técnico y de negocio

**Presupuesto participativo comunal con voto ZK y escrutinio auditable**  

**Equipo:** Denis Ferraro, Matías Bardonesca, Fabrizio Guarino y Julio Solórzano  

**Versión:** entrega resumida · octubre de 2026  

**Estado del producto:** MVP educativo en blockchain local

## Resumen ejecutivo

CivicTrust es una propuesta GovTech para que los vecinos participen en decisiones de presupuesto comunal y puedan consultar un escrutinio público. El diseño combina un padrón de identidades Semaphore con pruebas de conocimiento cero (ZK): el contrato comprueba que una credencial pertenece al grupo habilitado sin recibir el secreto de esa identidad.

El MVP demuestra el alta manual de compromisos, la publicación de consultas y el registro de votos en una red local Hardhat. No está conectado con miBA, DNI ni un padrón oficial, y todavía no usa una Layer 2 ni custodia fondos públicos. Esas integraciones forman parte de la evolución propuesta, no del producto implementado.

## 1. Definición del Problema

El presupuesto participativo depende de que los vecinos confíen en dos cosas: que el padrón y el recuento sean correctos, y que las decisiones aprobadas se puedan seguir. Cuando el registro, el escrutinio y la publicación de resultados dependen de una base centralizada difícil de auditar, puede ser difícil para la comunidad verificar qué ocurrió con cada voto. La percepción de identidades duplicadas o de fondos que no llegan a ejecutarse también puede debilitar la participación.

El problema técnico es permitir que una persona elegible emita un solo voto por consulta y que el sistema verifique esa elegibilidad sin publicar su identidad junto con la opción elegida. La emisión de credenciales y la verificación de que una credencial corresponde a una sola persona requieren, además, un proceso confiable de identidad civil.

## 2. Propuesta de Valor

CivicTrust plantea separar la comprobación de elegibilidad del contenido del voto. Semaphore permite demostrar mediante una prueba ZK que una credencial pertenece al padrón; un *nullifier* por consulta evita reutilizar esa credencial en la misma votación. El contrato valida la prueba y mantiene un conteo que cualquiera puede consultar en la red.

La blockchain aporta un registro compartido y difícil de alterar después de confirmado. La prueba ZK reduce la información de identidad que necesita el contrato. Esto no oculta la opción elegida: las opciones, el escrutinio y el índice de la opción registrado en el evento son públicos. El diseño busca hacer verificable el proceso, no convertir una consulta pública en un voto secreto.

Como modelo comercial propuesto, CivicTrust podría ofrecerse como servicio marca blanca a municipios y comunas, con licencia anual, configuración e integración con sistemas de identidad existentes. Ese modelo aún requiere validación con gobiernos y usuarios.

## 3. Arquitectura del Sistema

### 3.1 Capa de smart contracts

El MVP usa un contrato personalizado, `CivicTrustVoting.sol`, junto con los contratos de Semaphore. No emite tokens ERC-20 ni NFT ERC-721: la lógica implementada administra compromisos de identidad, consultas y conteos.

La cuenta administradora registra compromisos públicos, crea consultas con opciones y plazo, y puede cerrarlas. Para votar, `voteAnonymous` comprueba que la consulta esté abierta, que el grupo tenga al menos tres identidades, que la prueba corresponda al alcance de esa consulta y que la opción exista. Luego llama a Semaphore para validar la prueba y suma el voto. El evento publica la consulta, el índice de la opción y el *nullifier*, sin guardar la dirección del vecino como votante. El umbral de tres credenciales es una condición mínima de esta demo; por sí solo no garantiza anonimato ni que sean tres personas distintas.

### 3.2 Interacción de usuario

La administración usa MetaMask conectada a la red local Hardhat. El vecino no necesita conectar una billetera en esta demo: crea o importa una identidad Semaphore en el navegador, guarda su archivo secreto y comparte con la comuna únicamente el compromiso público. El administrador agrega ese compromiso al padrón. Una vez habilitada la identidad, el vecino elige una opción; el navegador genera la prueba ZK y la envía al servidor local. El servidor usa una cuenta de prueba como *relayer* para llamar al contrato.

```text
Vecino: credencial privada -> prueba ZK -> relayer local -> CivicTrustVoting -> Semaphore
Administrador: MetaMask local -> alta de compromisos y publicación de consultas
```

El archivo de identidad es secreto: quien lo obtenga puede votar usando esa credencial. La inscripción manual permite crear varias identidades desde un mismo equipo, por lo que el MVP no demuestra “una persona, una identidad”.

### 3.3 Componentes externos

En el MVP, Semaphore aporta el grupo de compromisos y la verificación de pruebas; Hardhat ejecuta una red EVM local; y un servidor local actúa como *relayer*. La prueba se genera en el navegador. No hay actualmente integración con proveedores de identidad oficiales, IPFS, oráculos, ERC-4337, *paymaster* ni una Layer 2.

Como evolución, podría integrarse un proveedor oficial para emitir una credencial única por residente, desplegar el sistema en una red de prueba y luego evaluar una Layer 2. IPFS, oráculos y firmas múltiples tendrían sentido si se construye un módulo futuro de trazabilidad de obras y desembolsos; no participan en la votación actual.

## 4. Stack Tecnológico

| Componente | Tecnología utilizada |
| --- | --- |
| Contratos | Solidity 0.8.28 |
| Compilación y red local | Hardhat 2.x, chain ID 31337 |
| Pruebas de pertenencia anónima | Semaphore Protocol 4.x |
| Comunicación con contratos | ethers.js 6.x |
| Interfaz web | HTML, CSS, JavaScript y Vite 7.x |
| Administración local | MetaMask y cuenta de prueba Hardhat |

## Modelo de negocio y evolución

El cliente objetivo de la propuesta son gobiernos municipales o comunales. El servicio marca blanca podría incluir alojamiento, soporte, configuración por comuna e integración de identidad; los precios y el alcance comercial deben validarse con instituciones reales.

Las siguientes etapas son propuestas: (1) definir emisión y revocación de credenciales con una autoridad de identidad; (2) desplegar en testnet, realizar auditorías y operar un *relayer* con monitoreo, presupuesto y controles antiabuso; (3) evaluar una Layer 2; y (4) diseñar trazabilidad de fondos por hitos con aprobaciones comunitarias. Ninguna de estas etapas está incluida en el MVP local.

## Riesgos y mitigaciones

- **Identidad y duplicados:** el padrón manual no evita múltiples credenciales por persona. La mitigación depende de una emisión institucional con controles de unicidad y privacidad.
- **Pérdida del secreto:** quien robe el archivo de identidad puede votar con esa credencial. Se necesita educación del usuario y, para una versión de producción, un mecanismo seguro de recuperación.
- **Gas y disponibilidad:** el *relayer* local usa cuentas de prueba y no representa un servicio gasless de producción. En producción habría costos de operación, riesgo de abuso y dependencia del servicio; se requerirían financiación, monitoreo, límites y redundancia.
- **Contratos y privacidad:** el código no está auditado para producción. Los resultados y opciones son públicos y el anonimato depende del tamaño y la composición real del padrón. Antes de un despliegue público hacen falta auditorías, pruebas de seguridad y una evaluación de privacidad.
- **Adopción:** sin integración oficial, accesibilidad y acompañamiento institucional, el prototipo no puede acreditar residencia ni garantizar participación representativa.

## Conclusión

CivicTrust demuestra un flujo local de consulta, prueba ZK y escrutinio verificable. Su valor es ofrecer una base técnica para estudiar transparencia y privacidad en decisiones comunales. La identidad civil, la resistencia a credenciales duplicadas, el despliegue público y la trazabilidad del gasto requieren trabajo institucional y técnico antes de cualquier uso real.
