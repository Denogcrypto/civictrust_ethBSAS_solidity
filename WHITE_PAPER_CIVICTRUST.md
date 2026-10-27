# WHITE PAPER: CIVICTRUST

## Plataforma GovTech Marca Blanca de Presupuesto Participativo & Trazabilidad Cívica en Blockchain

**Autores:** Equipo de Desarrollo CivicTrust  
Dennis Ferraro, Matias Bardonesca, Fabrizio Guarino y Julio Solorzano.  
**Versión:** 1.0 (MVP ETH-KIPU Developer Pack Nivel 1)  
**Fecha:** Octubre 2026

## RESUMEN EJECUTIVO Y ARQUITECTURA DE IDENTIDAD

### 1. Introducción y Visión

El presupuesto participativo es un pilar fundamental de la democracia moderna a nivel local. Sin embargo, su implementación en grandes centros urbanos enfrenta barreras significativas en términos de auditabilidad, manipulación de identidades y falta de trazabilidad en la ejecución del gasto público.

CivicTrust se presenta como una solución GovTech de marca blanca orientada a municipios y gobiernos comunales (ej. Ciudad Autónoma de Buenos Aires) que combina la facilidad del acceso ciudadano tradicional (Web2) con las garantías de inmutabilidad, auditoría pública y privacidad de la tecnología blockchain (Web3).

### 2. Gestión de Identidad y Resistencia Sybil

El mayor obstáculo en las votaciones electrónicas municipales es el problema de Sybil (creación de identidades falsas o multiplicidad de votos por persona). CivicTrust implementa una arquitectura híbrida:

1. **Autenticación Gubernamental (OAuth / SSI):** El ciudadano ingresa mediante el proveedor de identidad oficial (ej. miBA, Mi Argentina o credenciales gubernamentales locales).
2. **Generación de Credencial de Comuna:** La API de autenticación valida que el ciudadano reside en la comuna correspondiente y no ha ejercido su voto en el periodo activo.
3. **Abstracción de Billeteras (ERC-4337):** Al autenticarse, el sistema genera automáticamente una “Smart Account” para el usuario mediante Passkeys, eliminando la necesidad de gestionar frases semilla o pagar comisiones de gas.

```text
[Usuario / miBA] -> [Generación de ZK-Proof] -> [Relayer Gasless] -> [Smart Contract Votación]
```

## PRIVACIDAD ZK-PROOF Y MOTOR DE VOTACIÓN ON-CHAIN

### 3. Preservación del Anonimato Mediante Zero-Knowledge Proofs

A pesar de utilizar un inicio de sesión centralizado para validar la elegibilidad, la elección del votante debe ser estrictamente confidencial. Para lograrlo, CivicTrust implementa “Semaphore Protocol” sobre circuitos ZK-SNARKs:

- **a) Inclusión en el Grupo de Votantes:** La identidad autenticada se agrega a una lista de compromisos (“Merkle Tree”) correspondiente a su comuna.
- **b) Prueba de Pertenencia Anónima:** Al emitir el voto, el cliente genera localmente una prueba criptográfica (“Proof”) que demuestra que pertenece al árbol de residentes autorizados y que la constante de voto doble (“nullifier”) no ha sido utilizada previamente.
- **c) Verificación On-Chain:** El Smart Contract valida la “Proof” y registra el voto sin guardar ninguna relación entre la dirección de la transacción y los datos personales del votante.

### 4. Selección de Infraestructura Blockchain

Para garantizar costos predecibles e insignificantes por votación, el MVP utiliza una infraestructura “Layer 2 / Appchain” (Polygon CDK o Arbitrum Orbit):

- **Costos de Transacción:** Soportados íntegramente por el gobierno municipal mediante contratos “Paymaster” (ERC-4337).
- **Velocidad:** Finalidad de transacción en sub-segundos.
- **Transparencia:** Escrutinio auditable públicamente en tiempo real mediante un explorador de bloques dedicado.

## TRAZABILIDAD PRESUPUESTARIA, ROADMAP Y CONCLUSIÓN

### 5. Módulo de Trazabilidad y Desembolso por Hitos (Fase 2)

La verdadera transformación del presupuesto participativo requiere asegurar que los fondos asignados se gasten correctamente. CivicTrust expande su funcionalidad hacia la “gestión transparente de fondos comunales”:

1. **Bloqueo de Fondos Aprobados:** Una vez finalizada la votación, el presupuesto asignado a la obra ganadora se deposita en un Smart Contract de custodia (“Escrow”).
2. **Liberación por Hitos (Milestones):** Las empresas contratistas o cooperativas deben presentar pruebas de avance de obra (inspecciones, facturas digitalizadas, fotos geolocalizadas) vinculadas a un hash en IPFS.
3. **Oráculos & Auditoría Comunal:** La junta comunal y una comisión vecinal aprueban los hitos mediante firmas múltiples (Multi-Sig), desencadenando la liberación automática de los desembolsos.

```text
[Votación Aprobada] -> [Depósito en Escrow Contract] -> [Aprobación de Hito por Oráculo/Comisión] -> [Pago a Contratista]
```

### 6. Roadmap del Proyecto

- **Q1-Q2 2027 (MVP Core):** Desarrollo e integración del módulo de votación con ZK-Proofs y autenticación miBA.
- **Q3-Q4 2027 (Trazabilidad Presupuestaria):** Despliegue de contratos de trazabilidad y liberación de fondos por hitos de obra.
- **2028 (Gobernanza Avanzada):** Implementación de Votación Cuadrática para optimizar la distribución presupuestaria y escalado regional GovTech.

### 7. Conclusión

CivicTrust demuestra que la tecnología blockchain, combinada con circuitos de conocimiento cero y abstracción de cuenta, es el vehículo definitivo para devolver la confianza a los procesos democráticos locales, garantizando un manejo inalterable, transparente y auditable de los recursos públicos.
