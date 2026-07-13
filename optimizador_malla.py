import pulp
import json

def construir_y_resolver_modelo(asignaturas, aristas, S_max=10, L_max=12):
    """
    Construye y resuelve el modelo MILP para optimizar la malla curricular.
    
    Parámetros:
    - asignaturas: dict con la info de cada ramo. Formato esperado:
        {
            "id_ramo": {
                "nombre": "Cálculo I",
                "dificultad": 3, # d_i
                "nivel": 1       # lvl_i (1: Intro, 2: Básica, 3: Avanzada, 4: Titulación)
            }, ...
        }
    - aristas: lista de tuplas (id_prerrequisito, id_ramo_objetivo) que forman el DAG.
    - S_max: Número máximo de semestres permitidos (ej. 10 semestres = 5 años regulares).
    - L_max: Carga máxima permitida por semestre (dificultad total).
    
    Retorna:
    - Un diccionario con la distribución óptima de ramos por semestre si el modelo es factible.
    """
    print(f"Construyendo modelo MILP para {len(asignaturas)} asignaturas...")
    
    # 1. Inicializar el problema
    prob = pulp.LpProblem("Optimizacion_Malla_Curricular", pulp.LpMinimize)
    
    N = list(asignaturas.keys())
    S = list(range(1, S_max + 1))
    
    # Pre-calcular in-degrees para la regla de independencia en S1
    in_degree = {i: 0 for i in N}
    for u, v in aristas:
        if v in in_degree:
            in_degree[v] += 1
            
    # ==========================================
    # 2. Variables de Decisión
    # ==========================================
    
    # x_{is}: 1 si la asignatura i se imparte en el semestre s, 0 en caso contrario (Binaria)
    x = pulp.LpVariable.dicts("x", ((i, s) for i in N for s in S), cat='Binary')
    
    # T_i: Semestre en el que se cursa la asignatura i (Entera, auxiliar)
    T = pulp.LpVariable.dicts("T", (i for i in N), lowBound=1, upBound=S_max, cat='Integer')
    
    # C_max: Variable continua (Makespan) que representa el último semestre cursado en toda la carrera
    C_max = pulp.LpVariable("C_max", lowBound=1, upBound=S_max, cat='Continuous')
    
    # ==========================================
    # 3. Función Objetivo
    # ==========================================
    
    # Objetivo Principal: Minimizar C_max para comprimir la carrera al máximo.
    # Objetivo Secundario (epsilon): Minimizar la suma de los T_i empuja los ramos hacia
    # la izquierda (los primeros semestres) sin afectar el tiempo total C_max, evitando 
    # que queden ramos "flotando" en semestres tardíos si no es estrictamente necesario.
    epsilon = 0.001
    prob += C_max + epsilon * pulp.lpSum(T[i] for i in N), "Minimizar_Ultimo_Semestre_y_Pull_Izquierda"
    
    # ==========================================
    # 4. Restricciones
    # ==========================================
    
    for i in N:
        # Relación entre variable de asignación x y variable de tiempo T
        prob += T[i] == pulp.lpSum(s * x[i, s] for s in S), f"Def_T_{i}"
        
        # C_max debe ser mayor o igual al semestre de CUALQUIER asignatura
        prob += C_max >= T[i], f"Max_Semestre_{i}"
        
        # [A.1] Asignación Única: Cada asignatura debe ser programada exactamente una vez
        prob += pulp.lpSum(x[i, s] for s in S) == 1, f"Asignacion_Unica_{i}"
        
        nivel = asignaturas[i]["nivel"]
        
        # [B.4] Regla de Introducciones: Si no es nivel 1, no puede ir en S1
        if nivel > 1:
            prob += x[i, 1] == 0, f"No_S1_Nivel_Superior_{i}"
            
        # [B.5] Regla de Independencia S1: Si tiene algún prerrequisito, no puede ir en S1
        if in_degree[i] > 0:
            prob += x[i, 1] == 0, f"No_S1_Con_Prerreq_{i}"
            
        # [B.6] Jerarquía de Ciencias Básicas y Avanzadas
        if nivel == 2:
            prob += T[i] >= 2, f"Jerarquia_Nivel2_{i}"
        elif nivel == 3:
            prob += T[i] >= 3, f"Jerarquia_Nivel3_{i}"
            
        # [B.7] Anclaje al Extremo Derecho: Los ramos de Titulación (Nivel 4) deben ocurrir 
        # estrictamente en el ÚLTIMO semestre de la carrera (C_max).
        if nivel == 4:
            prob += T[i] == C_max, f"Anclaje_Derecho_Nivel4_{i}"
            
    # [A.2] Precedencia Estricta (Grafo Acíclico Dirigido)
    for u, v in aristas:
        prob += T[v] >= T[u] + 1, f"Precedencia_{u}_{v}"
        
    # [A.3] Balance de Carga Semestral (Restricción de mochila por semestre)
    for s in S:
        prob += pulp.lpSum(asignaturas[i]["dificultad"] * x[i, s] for i in N) <= L_max, f"Carga_Max_S{s}"
        
    # ==========================================
    # 5. Resolver el modelo
    # ==========================================
    
    print("Iniciando la resolución matemática (Branch and Bound)...")
    # Utilizamos CBC, el solver open-source por defecto de PuLP.
    prob.solve(pulp.PULP_CBC_CMD(msg=True))
    
    # ==========================================
    # 6. Procesamiento de Resultados
    # ==========================================
    
    estado = pulp.LpStatus[prob.status]
    print(f"\nEstado de la solución: {estado}")
    
    if prob.status == pulp.LpStatusOptimal:
        semestres_usados = int(C_max.varValue)
        print(f"¡Solución óptima global encontrada!")
        print(f"Tiempo total comprimido: {semestres_usados} semestres (Límite regular: {S_max})")
        
        malla_optima = {s: [] for s in range(1, semestres_usados + 1)}
        
        for i in N:
            s_optimo = int(round(T[i].varValue))
            malla_optima[s_optimo].append(asignaturas[i])
            
        for s in range(1, semestres_usados + 1):
            if malla_optima[s]:
                carga = sum(r["dificultad"] for r in malla_optima[s])
                print(f"\n--- SEMESTRE {s} (Carga: {carga}/{L_max} pts) ---")
                for ramo in sorted(malla_optima[s], key=lambda x: x["nivel"]):
                    print(f"  - [{ramo['nivel']}] {ramo['nombre']} (dif: {ramo['dificultad']})")
                    
        return malla_optima
    else:
        print("El solver demostró que NO existe ninguna solución posible con los parámetros actuales.")
        print("(Esto significa que es matemáticamente imposible comprimir la malla con las cargas/prerrequisitos dados).")
        return None

# ==============================================================================
# Script de Ejecución Independiente (Mockup con estructura de datos lista para 60 ramos)
# ==============================================================================
import os

if __name__ == "__main__":
    archivo_json = "datos_malla.json"
    
    if os.path.exists(archivo_json):
        print(f"Cargando datos reales desde {archivo_json}...")
        with open(archivo_json, 'r', encoding='utf-8') as f:
            datos = json.load(f)
            mis_asignaturas = datos['asignaturas']
            mis_aristas = datos['aristas']
        
        # Como los datos reales son muchos (ej. 60 ramos), Branch & Bound tomará más tiempo
        print(f"\n¡Se han cargado {len(mis_asignaturas)} asignaturas y {len(mis_aristas)} aristas!")
        print("NOTA: Al ser una malla completa (N > 50), el solver utilizará algoritmos profundos")
        print("de Branch and Bound. Esto puede tardar desde unos segundos hasta minutos dependiendo")
        print("de cuán restrictiva sea la carga (L_max) y los prerrequisitos.\n")
        
        # Subimos la carga a un valor realista para que no dé infactible.
        # Si un ramo pesa ~4 (creditos/2), 6 ramos por semestre son ~24 pts.
        L_max_real = 24 
        
        construir_y_resolver_modelo(
            asignaturas=mis_asignaturas, 
            aristas=mis_aristas, 
            S_max=10, 
            L_max=L_max_real
        )
    else:
        print(f"No se encontró '{archivo_json}'. Generando mockup de prueba rápida...")
        mis_asignaturas = {
            "MAT01": {"nombre": "Cálculo I", "dificultad": 4, "nivel": 1},
            "ALG01": {"nombre": "Álgebra Lineal", "dificultad": 4, "nivel": 1},
            "PROG01": {"nombre": "Programación", "dificultad": 3, "nivel": 1},
            
            "MAT02": {"nombre": "Cálculo II", "dificultad": 4, "nivel": 2},
            "PROG02": {"nombre": "Estructuras de Datos", "dificultad": 4, "nivel": 2},
            "FIS01": {"nombre": "Física Clásica", "dificultad": 4, "nivel": 2},
            
            "BD01": {"nombre": "Bases de Datos", "dificultad": 3, "nivel": 3},
            "RED01": {"nombre": "Redes de Computadores", "dificultad": 3, "nivel": 3},
            "SW01": {"nombre": "Ingeniería de Software", "dificultad": 4, "nivel": 3},
            
            "PROY01": {"nombre": "Proyecto de Título I", "dificultad": 5, "nivel": 3},
            "PROY02": {"nombre": "Proyecto de Título II", "dificultad": 5, "nivel": 4}
        }
        
        mis_aristas = [
            ("MAT01", "MAT02"),
            ("ALG01", "MAT02"),
            ("PROG01", "PROG02"),
            ("MAT02", "FIS01"),
            ("PROG02", "BD01"),
            ("PROG02", "RED01"),
            ("BD01", "SW01"),
            ("SW01", "PROY01"),
            ("PROY01", "PROY02")
        ]
        
        construir_y_resolver_modelo(
            asignaturas=mis_asignaturas, 
            aristas=mis_aristas, 
            S_max=10, 
            L_max=12
        )
