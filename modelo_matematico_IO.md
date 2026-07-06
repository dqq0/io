# Modelo Matemático Formal: Optimización de Mallas Curriculares (Proceso de Bolonia)

A continuación se presenta la formulación matemática exacta del modelo de **Investigación Operativa** que hemos construido en el código, traduciendo nuestras reglas heurísticas de JavaScript a Programación Lineal Entera Mixta (MILP).

---

## 1. Conjuntos y Parámetros (Datos de Entrada)
Basado en los atributos que procesamos del HTML:

*   **$N$**: Conjunto de todas las asignaturas originales (nodos).
*   **$S$**: Conjunto de semestres disponibles, $S = \{1, 2, \dots, S_{max}\}$ (Donde $S_{max} = 7$ por el estándar de Bolonia).
*   **$E$**: Conjunto de aristas de prerrequisitos. $(i, j) \in E$ significa que el ramo $i$ es prerrequisito estricto del ramo $j$.
*   **$d_i$**: Dificultad (peso) de la asignatura $i$ (calculada de 1 a 5).
*   **$C_i$**: Conjunto de competencias del ramo $i$ (ej. $\{calculo, ecuaciones\}$).
*   **$lvl_i$**: Nivel de profundidad formativa del ramo $i \in \{1, 2, 3, 4\}$.
*   **$p_i \in \{0, 1\}$**: Parámetro binario. $p_i = 1$ si el ramo es "Protegido/Intocable" (ej. Inglés, Titulación).
*   **$J(i, j)$**: Similitud de Jaccard entre las competencias de los ramos $i$ y $j$, dada por:
    $$J(i, j) = \frac{|C_i \cap C_j|}{|C_i \cup C_j|}$$
*   **$L_{max}$**: Límite de carga máxima de dificultad permitida por semestre (12 puntos).

---

## 2. Variables de Decisión
¿Qué es lo que el algoritmo está decidiendo en el fondo?

1.  **Variable de Fusión (Clustering):**
    $$y_{ij} \in \{0, 1\} \quad \forall i, j \in N, i < j$$
    $y_{ij} = 1$ si la asignatura $i$ y la asignatura $j$ deciden fusionarse en un Súper-Nodo, 0 en caso contrario.

2.  **Variable de Asignación Temporal (Scheduling):**
    $$x_{is} \in \{0, 1\} \quad \forall i \in N, \forall s \in S$$
    $x_{is} = 1$ si la asignatura $i$ (o el Súper-Nodo que la contiene) se imparte exactamente en el semestre $s$, 0 en caso contrario.

3.  **Variable de Tiempo (Auxiliar para Precedencia):**
    $$T_i = \sum_{s \in S} s \cdot x_{is}$$
    Representa el semestre exacto (valor entero de 1 a 7) en el que se ubica el ramo $i$.

---

## 3. Función Objetivo
Nuestro algoritmo busca lograr la malla más compacta posible en el tiempo, reduciendo el volumen de asignaturas pero penalizando fuertemente si nos pasamos del límite del Semestre 7.

**Minimizar:**
$$Z = \alpha \sum_{i \in N} T_i - \beta \sum_{i < j} y_{ij}$$

*Donde:*
*   El primer término "tira" todos los nodos hacia la izquierda (comprimiendo el tiempo hacia el semestre 1).
*   El segundo término recompensa y maximiza la cantidad de fusiones logradas para reducir la carga visual.
*   $\alpha$ y $\beta$ son pesos de calibración.

---

## 4. Restricciones (Requisitos Lógicos del Sistema)

### A. Restricciones Estructurales de Fusión
**1. Umbral de Similitud y Mismo Ciclo:**
Dos ramos solo pueden fusionarse si superan el Jaccard de 0.75 y pertenecen EXACTAMENTE al mismo nivel de profundidad:
$$y_{ij} = 1 \implies J(i,j) \ge 0.75 \quad \land \quad lvl_i = lvl_j \quad \forall i, j \in N$$

**2. Exclusión de Protegidos (Intocables):**
Ningún ramo protegido puede ser parte de una fusión:
$$y_{ij} \le 1 - p_i \quad \text{y} \quad y_{ij} \le 1 - p_j \quad \forall i, j \in N$$

**3. Límite de Absorción (Max 3 ramos por Súper-Nodo):**
Si asumimos $y_{ij}$ como componentes conexas, el tamaño máximo del clúster $K$ no puede superar 3:
$$\sum_{j \in N} y_{ij} \le 2 \quad \forall i \in N$$

---

### B. Restricciones Topológicas y de Calendario (Eje X)
Estas garantizan que el flujo del Grafo Acíclico Dirigido (DAG) jamás retroceda en el tiempo y respete Bolonia.

**4. Asignación Única:**
Cada asignatura debe existir en un único semestre:
$$\sum_{s=1}^{S_{max}} x_{is} = 1 \quad \forall i \in N$$

**5. Precedencia Estricta (Grafo Acíclico):**
Si un ramo $i$ abre al ramo $j$, el semestre de $j$ debe ser estrictamente mayor al de $i$:
$$T_j \ge T_i + 1 \quad \forall (i,j) \in E$$

**6. Balance de Carga Semestral:**
La sumatoria de dificultades de los ramos en un mismo semestre $s$ no puede exceder los 12 puntos:
$$\sum_{i \in N} d_i \cdot x_{is} \le L_{max} \quad \forall s \in S$$

---

### C. Restricciones del Proceso de Bolonia (Reglas de Oro)
Estas son las reglas matemáticas duras de nuestro nivel de profundidad (`_nivel_profundidad`):

**7. Regla de Introducciones (Nivel 1):**
Cualquier ramo que no sea nivel 1, NO puede estar en el semestre 1. (El semestre 1 es exclusivo).
$$lvl_i > 1 \implies x_{i1} = 0 \quad \forall i \in N$$

**8. Regla de Independencia S1:**
Incluso si es nivel 1, si tiene pre-requisitos de entrada, no puede estar en el semestre 1:
$$\text{Si } InDegree(i) > 0 \implies x_{i1} = 0 \quad \forall i \in N$$

**9. Jerarquía de Ciencias Básicas y Avanzados:**
*   Nivel 2 (Básicas) solo puede vivir del Semestre 2 en adelante: $T_i \ge 2 \quad \forall i \mid lvl_i = 2$
*   Nivel 3 (Avanzados) solo puede vivir del Semestre 3 en adelante: $T_i \ge 3 \quad \forall i \mid lvl_i = 3$

**10. Anclaje al Extremo Derecho (Titulación - Nivel 4):**
Todo ramo catalogado como nivel 4 debe ocurrir estrictamente en el último semestre (7):
$$lvl_i = 4 \implies x_{i7} = 1 \quad \forall i \in N$$
