# Fundamentos Teóricos y Matemáticos del Optimizador Curricular

Este documento establece las bases académicas, estructurales y matemáticas que justifican el algoritmo de optimización de mallas curriculares. El sistema no opera bajo reglas arbitrarias, sino que aplica **Investigación Operativa (Programación Lineal y Teoría de Grafos)** para migrar un modelo educativo tradicional al estándar internacional actual.

---

## 1. El Problema Base: Inviabilidad del Modelo Monolítico Tradicional

En los sistemas tradicionales (comunes en Latinoamérica), una carrera de ingeniería consta de 10 a 12 semestres (5 a 6 años) con más de 60 asignaturas obligatorias. 

Desde la perspectiva de la **Investigación Operativa**, este modelo es un **Grafo Acíclico Dirigido (DAG)** extremadamente ineficiente:
*   **Camino Crítico (CPM) Desproporcionado:** La longitud del camino más largo de prerrequisitos suele superar los 8 nodos, lo que significa que un solo fallo retrasa la carrera completa un año.
*   **Dimensionalidad Excesiva:** Existe una enorme cantidad de nodos redundantes (Ej: Cálculo I, II, III; Física I, II, III) que fragmentan las competencias.

---

## 2. El Proceso de Bolonia: La Restricción Temporal (Hard Constraint)

El **Proceso de Bolonia** (Declaración de Bolonia, 1999) es un acuerdo intergubernamental europeo diseñado para estandarizar la educación superior. Establece que un título de pregrado (*Bachelor* o Grado) debe durar un **máximo de 3 a 3.5 años (6 a 7 semestres)**, seguido de la opción de un Máster.

Matemáticamente, Bolonia introduce dos restricciones (constraints) duras a nuestro modelo de Programación Lineal:
1.  **Límite de Tiempo Absoluto:** $S_{max} \le 7$. Ningún nodo del grafo puede tener un nivel topológico mayor a 7.
2.  **Límite de Carga de Trabajo (Créditos ECTS):** Un estudiante no puede cursar asignaturas infinitas en un semestre. Formalizamos esto definiendo una carga máxima de dificultad por semestre: $\sum d_i \cdot x_{is} \le 12$.

---

## 3. El Modelo Undergrad (Major / Minor) como Relajación de Restricciones

Cuando intentamos resolver el modelo matemático para comprimir 60 nodos en 7 semestres respetando el límite de carga, el sistema computacional arroja **Inviabilidad (Infeasible Solution)**. Es físicamente imposible empaquetar toda esa información en 3.5 años sin sobrecargar al estudiante.

Aquí se fundamenta la necesidad del **Sistema Undergrad con Menciones (Minor)** (Típico del modelo anglosajón y europeo moderno):
*   **Major (Tronco Común):** Nodos estructurales que no pueden ser eliminados (Programación, Algoritmos, Matemáticas Básicas).
*   **Minor (Mención):** Permite **podar el grafo** heurísticamente antes de la optimización. 

En Programación Lineal, elegir un *Minor* (Ej: Economía) significa eliminar restricciones y variables irrelevantes del grafo (Ej: Nodos de Termodinámica o Mecánica Avanzada). Al hacer esto, **relajamos el espacio de soluciones**, permitiendo que el algoritmo encuentre una distribución topológica perfecta de 7 semestres sin violar el límite de carga ($L_{max}$).

---

## 4. Fundamentación del Clustering (Fusión de Nodos)

Aunque el uso del coeficiente de Jaccard es una métrica heurística rápida, su objetivo responde a un problema de **Investigación Operativa Clásica**: el **Agrupamiento en Grafos (Graph Partitioning / Set Covering Problem)**.

El objetivo de la educación por competencias (Bolonia) no es acumular ramos fragmentados, sino adquirir "habilidades integradas" ($C_i$). Si el Ramo A entrega la competencia $c_1$ y el Ramo B entrega $c_1$ y $c_2$, mantener ambos nodos es matemáticamente redundante. 

### Modelo Lineal Subyacente (Minimización de Nodos):
La decisión de agrupar busca minimizar la cantidad de vértices $|V|$ de la malla original, sujeto a la restricción de que el nuevo **Súper-Nodo** cubra todas las competencias originales sin violar la jerarquía académica (no mezclar ramos introductorios con avanzados).

En términos de **Álgebra de Grafos**, la fusión es una "contracción de aristas y vértices" basada en equivalencia estructural. Al contraer vértices, reducimos drásticamente las restricciones del modelo.

---

## 5. El Motor de Ordenamiento (Algoritmo de Kahn Modificado)

Una vez que el grafo ha sido podado (Minor) y contraído (Clustering), nos enfrentamos a un problema de **Programación de Tareas (Job-Shop Scheduling)**.
El código utiliza el **Algoritmo Topológico de Kahn**, inyectándole restricciones formales de Programación Lineal:

Sea $T_i$ el semestre asignado al nodo $i$:
1.  **Precedencia Estricta (Grafo Dirigido):** $T_j > T_i \quad \forall (i,j) \in E$ (El prerrequisito siempre ocurre antes).
2.  **Jerarquía de Niveles:** $T_i \ge lvl_i$ (Restricción de dominio: No puedes ubicar ciencias básicas en el semestre de inducción general).
3.  **Anclaje de Salida:** $T_i = 7 \quad si \quad lvl_i = 4$ (Prácticas y Titulación están matemáticamente fijadas al límite superior del tiempo).

**Conclusión Global:**
El sistema no es un simple filtro visual de JavaScript. Es un **optimizador heurístico** diseñado para resolver un problema de asignación de recursos y tiempos bajo restricciones duras. Demuestra matemáticamente que la única forma de alcanzar el estándar europeo de 7 semestres es abandonando el monolito tradicional, y adoptando tanto la contracción de vértices (modularidad) como la relajación de variables (Menciones/Undergrad).
