import time
import sys

# Colores ANSI
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
WHITE = '\033[97m'
RESET = '\033[0m'

def print_slow(text, delay=0.03):
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()

def step(text, delay=0.5):
    print(f"{CYAN}[*] {text}{RESET}")
    time.sleep(delay)

def run_animation():
    print(f"{MAGENTA}")
    print_slow("=========================================================", 0.01)
    print_slow("    MOTOR DE OPTIMIZACIÓN I.O. - MALLA CURRICULAR        ", 0.01)
    print_slow("=========================================================", 0.01)
    print(f"{RESET}")
    time.sleep(1)

    print_slow("Cargando grafo curricular inicial...", 0.05)
    time.sleep(0.5)

    print(f"{YELLOW}\n--- PARÁMETROS DEL MODELO (MILP) ---{RESET}")
    print(f"  • Límite Carga Máxima (L_max): {GREEN}40 Créditos{RESET}")
    print(f"  • Mención Seleccionada: {GREEN}Medio Ambiente y Ética{RESET}")
    print(f"  • Eximición Inglés (E_ingles): {GREEN}1 (Aprobado){RESET}")
    time.sleep(1.5)

    print(f"\n{YELLOW}--- FASE 1: PRE-PROCESAMIENTO Y BYPASS ---{RESET}")
    time.sleep(0.5)
    print(f"Aplicando filtro de Mención y Eximición...")
    time.sleep(1)

    ramos_eliminados = ["Inglés I", "Inglés II", "Inglés III", "Inglés IV", "Introducción a la Física", "Física Contemporánea"]
    for ramo in ramos_eliminados:
        print(f"  => Eliminando nodo: {RED}{ramo}{RESET}")
        time.sleep(0.2)

    print(f"\n{BLUE}[SISTEMA DE MENCIONES] Ramos eliminados de la matriz de adyacencia.{RESET}")
    time.sleep(0.5)
    step("Ejecutando Bypass Topológico: Reconectando sucesores de Física Contemporánea...")
    step("DAG Reestructurado exitosamente.")
    time.sleep(1)

    print(f"\n{YELLOW}--- FASE 2: ORDENAMIENTO TOPOLÓGICO (ALGORITMO DE KAHN) ---{RESET}")
    time.sleep(1)

    ramos_evaluados = [
        ("Álgebra Lineal", 1, 5, 1, "Sin restricciones previas."),
        ("Programación Avanzada", 2, 5, 2, "Pre-req completados."),
        ("Estadística Computacional", 6, 5, 4, f"{MAGENTA}Cota Inferior Proporcional activa (Original S6 -> Min S4){RESET}"),
        ("Inteligencia Artificial", 7, 5, 5, f"{MAGENTA}Cota Inferior Proporcional activa (Original S7 -> Min S5){RESET}")
    ]

    for ramo, orig_sem, creds, new_sem, obs in ramos_evaluados:
        print(f"Calculando posición óptima para: {WHITE}{ramo}{RESET} (Sem. Orig: {orig_sem}, Créditos: {creds})")
        time.sleep(0.5)
        print(f"  -> Evaluando InDegree... Listo.")
        time.sleep(0.3)
        print(f"  -> {obs}")
        time.sleep(0.3)
        print(f"  -> Bin Packing Semestral: Carga < 40 SCT.")
        time.sleep(0.3)
        print(f"  -> Restricción: Conservación Proporcional de Ramos.")
        time.sleep(0.4)

    print(f"{YELLOW}--- FASE 3: ANCLAJE RETROACTIVO (CIERRE) ---{RESET}")
    time.sleep(0.5)
    step("Anclando Actividad de Titulación a S8 (Final)")
    step("Anclando Práctica Profesional I a S6 (N-2)")
    time.sleep(1)

    print(f"\n{MAGENTA}=========================================================")
    print_slow("    MALLA CURRICULAR OPTIMIZADA (RESULTADO MILP)         ", 0.02)
    print("=========================================================")
    print(f"{RESET}")
    time.sleep(0.5)

    # Tabla ASCII
    print(f"{CYAN}+---------+-----------------------------------------+---------+")
    print(f"| {WHITE}Semestre{CYAN}| {WHITE}Asignaturas Clave                       {CYAN}| {WHITE}Carga   {CYAN}|")
    print(f"+---------+-----------------------------------------+---------+{RESET}")
    print(f"| {GREEN}   1    {RESET}| Intro al Cálculo, Prog. Computacional   |   28    |")
    print(f"| {GREEN}   2    {RESET}| Cálculo I, Prog. Avanzada, Álgebra I    |   30    |")
    print(f"| {GREEN}   3    {RESET}| Cálculo II, Álgebra II, Téc. Progr.     |   22    |")
    print(f"| {GREEN}   4    {RESET}| Cálculo III, Est. y Prob, DOO, EDO      |   34    |")
    print(f"| {GREEN}   5    {RESET}| {MAGENTA}Est. Computacional, Int. Artificial{RESET}     |   24    |")
    print(f"| {GREEN}   6    {RESET}| Inv. Operativa, Minería Datos, Elect. I |   28    |")
    print(f"| {GREEN}   7    {RESET}| Ing. Software, Form. Proyecto, Práctica |   18    |")
    print(f"| {GREEN}   8    {RESET}| Actividad de Titulación                 |   20    |")
    print(f"{CYAN}+---------+-----------------------------------------+---------+{RESET}")
    time.sleep(1)

    print(f"\n{GREEN}¡Optimización completada con éxito en 0.042 ms!{RESET}\n")

if __name__ == "__main__":
    try:
        run_animation()
    except KeyboardInterrupt:
        print(f"\n{RED}Animación cancelada.{RESET}")
        sys.exit(0)
