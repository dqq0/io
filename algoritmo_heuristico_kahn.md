# El Puente Hacia el Código: La Heurística Voraz (Kahn Modificado)

El modelo de Programación Lineal Entera Mixta (MILP) documentado en `modelo_matematico_IO.md` establece las **reglas exactas y perfectas** del sistema. Sin embargo, encontrar la solución exacta de un modelo NP-Hard en tiempo real directamente en el navegador del usuario (Javascript puro) presentaría graves problemas de rendimiento (congelamiento de la interfaz durante minutos debido al árbol de *Branch and Bound*).

Para solucionar esto, en nuestro motor de JavaScript (`main.js`) empleamos un enfoque de **Investigación de Operaciones Avanzada**: construimos una **Heurística Voraz basada en el Algoritmo de Ordenamiento Topológico de Kahn**, modificada específicamente para imponer las restricciones del MILP al vuelo.

Este enfoque nos permite obtener resultados matemáticamente válidos (y cuasi-óptimos) en cuestión de milisegundos.

---

## 1. Fase de Pre-Procesamiento: Intervención de la Matriz de Adyacencia

Antes de evaluar tiempos o restricciones, simulamos los parámetros binarios del modelo MILP ($E_{ingles}$ y eximiciones por Mención) mediante podas de grafos:

1. **Variables Binarias de Exclusión:** Se filtran los nodos que cumplen con la eliminación (Ej. si $E_{ingles} = 1$, los nodos de idiomas se marcan para destrucción).
2. **Operación Bypass (Reconexión Lógica):** No basta con borrar un ramo. Si "Matemática I" abría "Física I", y "Física I" abría "Mecánica", eliminar "Física I" rompería el DAG (Grafo Acíclico Dirigido). 
   - El código identifica los pre-requisitos y sucesores del ramo eliminado.
   - Crea aristas temporales (bypass) conectando directamente "Matemática I" con "Mecánica".
   - Finalmente, se eliminan el nodo y sus aristas originales, asegurando que la topología global se mantenga íntegra.

---

## 2. Fase de Procesamiento Topológico: Algoritmo de Kahn Modificado

El Algoritmo de Kahn original encuentra un orden lineal en un DAG (Grafo Acíclico Dirigido) buscando siempre los nodos con **Grado de Entrada Cero** ($InDegree = 0$). Hemos expandido este motor con tres grandes modificaciones de I.O.

### A. Cola de Prioridad Computacional
En lugar de tomar cualquier ramo disponible (FIFO o LIFO), ordenamos la `readyQueue` basándonos en el nivel original del ramo y su peso en créditos:
* **Priorización de Secuencia:** Se procesan primero los ramos de semestres más bajos (`level`) para garantizar que las bases matemáticas siempre tengan precedencia.
* **Priorización Voraz (Pesos pesados primero):** En caso de empate de nivel, se priorizan los ramos con más créditos. Esto facilita el empaquetamiento (Bin Packing), dejando los ramos "pequeños" para rellenar los huecos del semestre al final.

### B. Frontera de Restricción Activa (Cota Inferior Topológica)
Al analizar el siguiente ramo de la cola, el algoritmo lee instantáneamente la solución parcial de sus pre-requisitos:
* Se define un semestre mínimo absoluto $S_{min} = \max(T_{prereq}) + 1$.
* Esta es la implementación algorítmica de la restricción MILP: $T_j \ge T_i + 1$.

### C. Límite Proporcional de Adelanto (Modelo de Bolonia Dinámico)
Si los ramos intermedios fueron borrados, un ramo avanzado como "Estadística Computacional" quedará con $InDegree = 0$ muy pronto. Para evitar que caiga en el Semestre 1 o 2, imponemos la restricción proporcional del MILP matemáticamente en cada iteración:
$$S_{min\_prop} = \lfloor \frac{lvl_{original}}{S_{original}} \times \lceil \frac{Créditos Totales Activos}{L_{max}} \rceil \rfloor$$
El semestre asignado será siempre $\max(S_{min\_topologico}, S_{min\_prop})$.

---

## 3. Fase de Evaluación de Capacidad (Bin Packing Semestral)

Una vez que Kahn y las Cotas Inferiores nos dictan a partir de qué semestre puede darse el ramo, el sistema simula la restricción MILP de Carga Máxima:
$$\sum c_i \cdot x_{is} \le L_{max}$$

* El código inicia un ciclo `while (assignedS < maxSemesters)` partiendo desde $S_{min}$.
* Revisa el "Balde" (Bucket) de créditos ya asignados al semestre actual.
* Si agregar el ramo excede los 40 créditos, salta el ramo al siguiente semestre ($assignedS++$).
* Si entra perfecto, se "empaqueta", se actualiza la carga del semestre, y el ramo se da por asignado de manera final en esa iteración.

---

## 4. Fase de Liberación y Retroactividad

Al final de la iteración de un ramo, este "libera" la restricción que imponía sobre sus dependientes, restando 1 al $InDegree$ de todos sus sucesores directos. Si un sucesor llega a $InDegree = 0$, ingresa inmediatamente a la cola de prioridad.

**Anclaje Retroactivo:**
Los ramos de cierre (Formulación, Titulación, Prácticas) quedan intencionalmente fuera de este bucle topológico.
Al final, cuando el algoritmo determina que la malla completa logró comprimirse (ej. en el Semestre 8), se anclan matemáticamente:
* Titulación $\rightarrow S_8 + 1$
* Formulación $\rightarrow S_8$
* Práctica I $\rightarrow \max(1, S_8 - 2)$

## Resumen del Motor Híbrido
Lo que el algoritmo logra, esencialmente, es resolver una relajación de la Programación Lineal combinada con Bin Packing (Empaquetamiento en Baldes), obteniendo de manera determinista un acomodo legal y altamente compacto en $O(V + E)$, mil veces más rápido que una solución exacta MILP en el navegador.
