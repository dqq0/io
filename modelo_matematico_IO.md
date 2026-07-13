# Modelo Matemático Formal: Optimización de Mallas Curriculares (Proceso de Bolonia)

A continuación se presenta la formulación matemática exacta del modelo de **Investigación Operativa** que hemos construido en el código, traduciendo nuestras reglas heurísticas de JavaScript a Programación Lineal Entera Mixta (MILP).

---

## 1. Conjuntos y Parámetros (Datos de Entrada)
Basado en los atributos que procesamos del HTML:

*   **$N$**: Conjunto de todas las asignaturas originales (nodos).
*   **$S$**: Conjunto de semestres disponibles, $S = \{1, 2, \dots, S_{max}\}$ (Donde $S_{max} = 7$ por el estándar de Bolonia).
*   **$E$**: Conjunto de aristas de prerrequisitos. $(i, j) \in E$ significa que el ramo $i$ es prerrequisito estricto del ramo $j$.
*   **$c_i$**: Créditos de la asignatura $i$ (reemplaza a la dificultad estática).
*   **$A_i$**: Área de conocimiento de la asignatura $i$ (ej. Ciencias Básicas, Programación, Humanidades).
*   **$lvl_i$**: Nivel de profundidad formativa del ramo $i \in \{1, 2, 3, 4\}$.
*   **$p_i \in \{0, 1\}$**: Parámetro binario. $p_i = 1$ si el ramo es "Protegido/Intocable" (ej. Inglés, Titulación).
*   **$P_{ingreso}$**: Puntaje de ingreso a la universidad del estudiante (ej. PSU/PAES/Selectividad).
*   **$E_{ingles} \in \{0, 1\}$**: Parámetro binario que indica si el alumno aprobó la prueba diagnóstica de inglés ($1=$ Aprobado).
*   **$H_{alumno}$**: Factor de historial académico o rendimiento del estudiante (ej. un multiplicador $\ge 1.0$ si tiene buenas notas).
*   **$L_{base}$**: Límite de carga de créditos base permitida por semestre (ej. 30 SCT).
*   **$L_{max}$**: Límite máximo dinámico de créditos por semestre, definido como $L_{max} = L_{base} \times H_{alumno}$.

---

## 2. Variables de Decisión
¿Qué es lo que el algoritmo está decidiendo en el fondo?

1.  **Variable de Asignación Temporal (Scheduling):**
    $$x_{is} \in \{0, 1\} \quad \forall i \in N, \forall s \in S$$
    $x_{is} = 1$ si la asignatura $i$ se imparte exactamente en el semestre $s$, 0 en caso contrario.

3.  **Variable de Tiempo (Auxiliar para Precedencia):**
    $$T_i = \sum_{s \in S} s \cdot x_{is}$$
    Representa el semestre exacto (valor entero de 1 a 7) en el que se ubica el ramo $i$.

---

## 3. Función Objetivo
Nuestro algoritmo busca lograr la malla más compacta posible en el tiempo, reduciendo el volumen de asignaturas pero penalizando fuertemente si nos pasamos del límite del Semestre 7.

**Minimizar:**
$$Z = \sum_{i \in N} T_i$$

*Donde:*
*   El término "tira" todos los nodos hacia la izquierda (comprimiendo el tiempo hacia el semestre 1).

---

## 4. Restricciones (Requisitos Lógicos del Sistema)

### A. Restricciones Topológicas y de Calendario (Eje X)
Estas garantizan que el flujo del Grafo Acíclico Dirigido (DAG) jamás retroceda en el tiempo y respete Bolonia.

**1. Asignación Única:**
Cada asignatura debe existir en un único semestre:
$$\sum_{s=1}^{S_{max}} x_{is} = 1 \quad \forall i \in N$$

**2. Precedencia Estricta y Relajación Pedagógica (Co-requisitos):**
Por defecto, si un ramo $i$ abre al ramo $j$, el semestre de $j$ debe ser estrictamente mayor al de $i$:
$$T_j \ge T_i + 1 \quad \forall (i,j) \in (E \setminus E_{flex})$$

Sin embargo, el optimizador identifica un subconjunto de aristas flexibles $E_{flex} \subset E$ donde, por razones de complementariedad empírica (ej. *Investigación Operativa* con *Álgebra Lineal*, o *Inteligencia Artificial* con *Estadística Computacional*), se permite cursar ambas asignaturas en el mismo semestre. Para estas excepciones, la restricción se relaja a una desigualdad no estricta:
$$T_j \ge T_i \quad \forall (i,j) \in E_{flex}$$

**6. Conservación Proporcional de Ramos Avanzados (Cota Inferior Relativa):**
Para evitar que asignaturas de semestres superiores, que queden sin pre-requisitos (ej. por eximición o rutas alternativas), se adelanten prematuramente junto a introducciones, se impone un escalamiento proporcional. 
Si $S_{orig}$ es la duración original de la malla (sin titulación) y $S_{opt}$ es la duración estimada de la malla optimizada ($\lceil \frac{\sum c_i}{L_{max}} \rceil$), un ramo originario del semestre $lvl_i$ no puede bajar de su fracción proporcional de progreso:
$$T_i \ge \lfloor \frac{lvl_i}{S_{orig}} \times S_{opt} \rfloor \quad \forall i \in N$$

**7. Balance de Carga Semestral:**
La sumatoria de créditos de los ramos en un mismo semestre $s$ no puede exceder el límite máximo dinámico (que sube si el alumno rinde bien):
$$\sum_{i \in N} c_i \cdot x_{is} \le L_{max} \quad \forall s \in S$$

---

### C. Restricciones del Proceso de Bolonia (Reglas de Oro)
Estas son las reglas matemáticas duras de las bases (introducciones) y los cierres (prácticas/titulación):

**7. Regla de Introducciones (Nivel 1):**
Cualquier ramo que no sea nivel 1, NO puede estar en el semestre 1. (El semestre 1 es exclusivo).
$$lvl_i > 1 \implies x_{i1} = 0 \quad \forall i \in N$$

**8. Regla de Independencia S1:**
Incluso si es nivel 1, si tiene pre-requisitos de entrada, no puede estar en el semestre 1:
$$\text{Si } InDegree(i) > 0 \implies x_{i1} = 0 \quad \forall i \in N$$

**9. Asignación Extracurricular y Retroactiva (Prácticas y Cierres):**
Los ramos de cierre (Prácticas y Titulación) no poseen requisitos topológicos de precedencia ni compiten por la carga límite de créditos del semestre ($L_{max}$), ya que se realizan "por fuera" del periodo de clases regular. En su lugar, su ubicación matemática se fija de forma retroactiva a partir de la longitud total comprimida de la malla ($N = \max_i T_i$ para los ramos regulares):
*   *Actividad de Titulación* se sitúa en el semestre definitivo: $T_{titulacion} = N + 1$
*   *Formulación de Proyecto* y *Práctica Profesional II* se sitúan un semestre antes: $T_i = N \quad \forall i \in \{Formulacion, Practica_2\}$
*   *Práctica Profesional I* se sitúa matemáticamente distanciada: $T_{practica1} = \max(1, N - 2)$

### D. Restricciones Personalizadas del Perfil del Estudiante

**11. Exención por Puntaje de Ingreso:**
Si el estudiante tiene un puntaje de ingreso destacado (ej. $\ge 800$ puntos), se le exime automáticamente de los ramos de nivelación/introducción básica (asumamos que pertenecen a un subconjunto $I_{intro} \subset N$):
$$P_{ingreso} \ge 800 \implies \sum_{s=1}^{S_{max}} x_{is} = 0 \quad \forall i \in I_{intro}$$
*(Nota: Al forzar que la sumatoria sea 0, el ramo no se asigna a ningún semestre, "desapareciendo" de la carga del alumno).*

**12. Exención Total por Prueba de Diagnóstico de Inglés:**
Si el estudiante aprueba el test de suficiencia o eximición de inglés al inicio ($E_{ingles} = 1$), se eliminan todos los módulos del idioma de la malla (subconjunto $I_{ingles} \subset N$), liberando carga crediticia vital para la compresión de semestres:
$$E_{ingles} = 1 \implies \sum_{s=1}^{S_{max}} x_{is} = 0 \quad \forall i \in I_{ingles}$$
