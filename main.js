document.querySelectorAll('td.asignatura__normal').forEach(celda => {
    // Remover el title nativo para que no aparezcan las notas al hacer hover
    celda.removeAttribute('title');

    // Cuando el mouse entra a la celda
    celda.addEventListener('mouseenter', function () {
      this.classList.add('hover-activo');

      const reqsRaw = this.getAttribute('requisitos');
      if (!reqsRaw) return; // Si no tiene requisitos, no hace nada

      // Separar cada requisito (ej: "1-1-1-P")
      const reqs = reqsRaw.split(',');

      reqs.forEach(req => {
        const partes = req.split('-');
        const targetId = partes[0]; // El ID del ramo objetivo
        const tipo = partes[3];     // 'P' o 'A'

        const targetCelda = document.getElementById(targetId);

        if (targetCelda) {
          if (tipo === 'P') {
            targetCelda.classList.add('prereq-rojo');
          } else if (tipo === 'A') {
            targetCelda.classList.add('abre-verde');
          }
        }
      });
    });

    // Cuando el mouse sale de la celda (limpiar)
    celda.addEventListener('mouseleave', function () {
      this.classList.remove('hover-activo');

      // Buscamos todas las celdas que pintamos y las limpiamos
      document.querySelectorAll('.prereq-rojo, .abre-verde').forEach(target => {
        target.classList.remove('prereq-rojo', 'abre-verde');
      });
    });
  });

  // --- Lógica del Grafo Interactivo (Vis.js) ---
  let network = null;

  function buildGraphData() {
    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();
    const addedNodes = new Set();
    const addedEdges = new Set();

    document.querySelectorAll('td.asignatura__normal').forEach(celda => {
      const id = celda.getAttribute('id');
      if (!id || id === '0') return; // Ignorar celdas de relleno

      if (!addedNodes.has(id)) {
        const codigo = celda.getAttribute('asicodigo');
        const nombreEl = celda.querySelector('.nodesbordarSimple');
        const nombre = nombreEl ? nombreEl.innerText : '';
        const estado = celda.getAttribute('clasedefecto');
        let semestre = parseInt(celda.getAttribute('semestre')) || 0;

        let colorObj = { background: '#f8f9fa', border: '#ccc' }; // No Cursada
        if (estado === 'asignatura__APROBADO') colorObj = { background: '#d4edda', border: '#28a745' };
        else if (estado === 'asignatura__REPROBADO') colorObj = { background: '#f8d7da', border: '#dc3545' };
        else if (estado === 'asignatura__INSCRITO') colorObj = { background: '#cce5ff', border: '#007bff' };

        // --- Datos simulados para Investigación Operativa ---
        const diff = (nombre.length % 5) + 1; // Dificultad determinista de 1 a 5
        const nm = nombre.toUpperCase();
        let esProtegido = false;

        // Exclusión de Intocables: Inglés, Prácticas, Titulación
        if (nm.includes('INGLES') || nm.includes('INGLÉS') || nm.includes('PRACTICA') || nm.includes('PRÁCTICA') || nm.includes('TITULACION') || nm.includes('TITULACIÓN') || nm.includes('MEMORIA') || nm.includes('TRABAJO DE TITULO')) {
          esProtegido = true;
        }

        let comps = [];
        if (nm.includes('CALCULO') || nm.includes('CÁLCULO')) comps.push('calculo');
        if (nm.includes('ALGEBRA') || nm.includes('ÁLGEBRA')) comps.push('algebra');
        if (nm.includes('ECUACION') || nm.includes('ECUACIÓN') || nm.includes('DIFERENCIALES')) comps.push('ecuaciones');
        if (nm.includes('FISICA') || nm.includes('FÍSICA')) comps.push('fisica');
        if (nm.includes('MECANICA') || nm.includes('MECÁNICA')) comps.push('mecanica');
        if (nm.includes('ELECTRO')) comps.push('electromagnetismo');
        if (nm.includes('TERMO')) comps.push('termodinamica');
        if (nm.includes('PROGRAMACION') || nm.includes('PROGRAMACIÓN') || nm.includes('PROG')) comps.push('programacion');
        if (nm.includes('OBJETOS') || nm.includes('TECNICAS') || nm.includes('TÉCNICAS')) comps.push('poo');
        if (nm.includes('BASE DE DATOS') || nm.includes('DATOS')) comps.push('datos');
        if (nm.includes('WEB')) comps.push('web');
        if (nm.includes('SOCIEDAD') || nm.includes('ETICA') || nm.includes('ÉTICA') || nm.includes('MEDIO AMBIENTE')) comps.push('humanidades');
        if (nm.includes('PROYECTO') || nm.includes('EMPRESA') || nm.includes('GESTION') || nm.includes('GESTIÓN')) comps.push('gestion');
        if (comps.length === 0) comps = ['general']; // Fallback

        // Asignación de Nivel de Profundidad (CRÍTICO: 1 al 4)
        let nivel_profundidad = 3; // Avanzados por defecto
        if (esProtegido && (nm.includes('TITULACION') || nm.includes('TITULACIÓN') || nm.includes('MEMORIA') || nm.includes('PRACTICA') || nm.includes('PRÁCTICA'))) {
          nivel_profundidad = 4; // Titulación/Prácticas Finales
        } else if (comps.includes('calculo') || comps.includes('algebra') || comps.includes('fisica') || comps.includes('mecanica') || comps.includes('ecuaciones')) {
          nivel_profundidad = 2; // Ciencias Básicas / Cálculos
        } else if (semestre <= 2 || nm.includes('INTRO') || nm.includes('FUNDAMENTO')) {
          nivel_profundidad = 1; // Introducciones
        }

        let rowIndex = 0;
        let tr = celda.closest('tr');
        if (tr && tr.parentNode) rowIndex = Array.from(tr.parentNode.children).indexOf(tr);

        nodes.add({
          id: id,
          label: `<b>${codigo}</b>\n${nombre}`,
          x: semestre * 350,
          y: rowIndex * 120,
          color: colorObj,
          shape: 'box',
          margin: { top: 15, bottom: 15, left: 20, right: 20 },
          font: { multi: 'html', size: 16, face: 'system-ui, sans-serif' },
          shadow: { enabled: true, color: 'rgba(0,0,0,0.15)', size: 10, x: 5, y: 5 },
          // Metadatos I.O.
          _dificultad: diff,
          _competencias: comps,
          _esProtegido: esProtegido,
          _originalColor: colorObj,
          _originalRow: rowIndex
        });
        addedNodes.add(id);
      }

      const reqsRaw = celda.getAttribute('requisitos');
      if (reqsRaw) {
        const reqs = reqsRaw.split(',');
        reqs.forEach(req => {
          const partes = req.split('-');
          const targetId = partes[0];
          const tipo = partes[3];

          if (targetId && targetId !== '0') {
            // targetId es pre-requisito ('P') del id actual
            if (tipo === 'P') {
              const edgeId = `${targetId}-${id}`;
              if (!addedEdges.has(edgeId)) {
                edges.add({
                  id: edgeId,
                  from: targetId,
                  to: id,
                  arrows: 'to',
                  color: { color: '#aaa', highlight: '#333' },
                  smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 }
                });
                addedEdges.add(edgeId);
              }
            }
          }
        });
      }
    });

    return { nodes, edges };
  }

  document.getElementById('btnToggleView').addEventListener('click', function () {
    const malla = document.getElementById('malla-container');
    const netUI = document.getElementById('network-ui');
    const netContainer = document.getElementById('network-container');
    const cpmContainer = document.getElementById('cpm-container');

    if (netUI.style.display === 'none') {
      malla.style.display = 'none';
      cpmContainer.style.display = 'none';
      netUI.style.display = 'block';
      netContainer.style.display = 'block'; // Asegurar que el canvas de Vis.js esté visible

      if (!network) {
        const data = buildGraphData();
        const options = {
          layout: { hierarchical: false }, // Apagamos la jerarquía estricta para usar Coordenadas Absolutas (Grid Manual)
          physics: { enabled: false }, // Sin físicas, los nodos se quedarán en su X e Y asignados de forma rígida
          edges: {
            smooth: {
              type: 'cubicBezier',
              forceDirection: 'horizontal',
              roundness: 0.5
            },
            color: { inherit: false, color: '#b3b3b3' },
            arrows: { to: { enabled: true, scaleFactor: 1.2 } }
          },
          nodes: {
            shape: 'box',
            margin: { top: 15, bottom: 15, left: 20, right: 20 },
            font: { size: 16, multi: 'html', face: 'system-ui, sans-serif' },
            borderWidth: 2,
            shadow: { enabled: true, color: 'rgba(0,0,0,0.15)', size: 10, x: 5, y: 5 }
          },
          interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            hover: true
          }
        };
        network = new vis.Network(netContainer, data, options);
      }
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'btnCloseNetwork') {
      document.getElementById('network-ui').style.display = 'none';
      const btnCPM = document.getElementById('btnToggleCPM');
      if (btnCPM.innerText.includes('Volver')) {
        document.getElementById('cpm-container').style.display = 'block';
      } else {
        document.getElementById('malla-container').style.display = 'block';
      }
    }
  });

  // --- Lógica de la Ruta Crítica (CPM) ---
  let cpmCalculated = false;

  function calcularCPM() {
    const nodes = {};

    // 1. Recolectar nodos y aristas de la malla original
    document.querySelectorAll('#malla-container td.asignatura__normal').forEach(celda => {
      const id = celda.getAttribute('id');
      if (!id || id === '0') return;

      if (!nodes[id]) {
        nodes[id] = { id: id, pre: [], suc: [], es: 0, ef: 1, ls: 0, lf: 0, slack: 0 };
      }

      const reqsRaw = celda.getAttribute('requisitos');
      if (reqsRaw) {
        const reqs = reqsRaw.split(',');
        reqs.forEach(req => {
          const partes = req.split('-');
          const targetId = partes[0];
          const tipo = partes[3];

          if (targetId && targetId !== '0') {
            // Si targetId es 'P' (Pre-requisito de id)
            if (tipo === 'P') {
              if (!nodes[targetId]) nodes[targetId] = { id: targetId, pre: [], suc: [], es: 0, ef: 1, ls: 0, lf: 0, slack: 0 };
              nodes[id].pre.push(targetId);
              nodes[targetId].suc.push(id);
            }
          }
        });
      }
    });

    // 2. Forward Pass (Calcular Early Start y Early Finish)
    let changed = true;
    while (changed) {
      changed = false;
      for (const id in nodes) {
        const node = nodes[id];

        let maxPredEF = 0;
        node.pre.forEach(p => {
          if (nodes[p].ef > maxPredEF) maxPredEF = nodes[p].ef;
        });

        // Si no tiene pre-requisitos se queda en es=0, ef=1
        if (node.pre.length === 0) continue;

        if (node.es !== maxPredEF) {
          node.es = maxPredEF;
          node.ef = node.es + 1; // Duración = 1 semestre
          changed = true;
        }
      }
    }

    let projectDuration = 0;
    for (const id in nodes) {
      if (nodes[id].ef > projectDuration) projectDuration = nodes[id].ef;
    }

    // 3. Backward Pass (Calcular Late Finish y Late Start)
    for (const id in nodes) {
      nodes[id].lf = projectDuration;
      nodes[id].ls = nodes[id].lf - 1;
    }

    changed = true;
    while (changed) {
      changed = false;
      for (const id in nodes) {
        const node = nodes[id];
        if (node.suc.length > 0) {
          let minSuccLS = projectDuration;
          node.suc.forEach(s => {
            if (nodes[s].ls < minSuccLS) minSuccLS = nodes[s].ls;
          });
          if (node.lf !== minSuccLS) {
            node.lf = minSuccLS;
            node.ls = node.lf - 1;
            changed = true;
          }
        }
      }
    }

    // 4. Calcular Holgura (Slack)
    for (const id in nodes) {
      nodes[id].slack = nodes[id].ls - nodes[id].es;
    }

    return nodes;
  }

  document.getElementById('btnToggleCPM').addEventListener('click', function () {
    const malla = document.getElementById('malla-container');
    const cpmContainer = document.getElementById('cpm-container');
    const netUI = document.getElementById('network-ui');

    if (cpmContainer.style.display === 'none') {
      // Activar vista CPM
      malla.style.display = 'none';
      netUI.style.display = 'none'; // Solo ocultar UI
      cpmContainer.style.display = 'block';

      this.innerText = 'Volver a Vista de Tabla';
      this.style.backgroundColor = '#6c757d';

      if (!cpmCalculated) {
        // Clonar la tabla de la malla al contenedor CPM
        const tablaOriginal = document.querySelector('#malla-container .contenedorMalla:nth-of-type(2)');
        if (tablaOriginal) {
          const tablaClonada = tablaOriginal.cloneNode(true);
          cpmContainer.appendChild(tablaClonada);

          const cpmData = calcularCPM();

          // Aplicar clases según el Slack (Holgura)
          cpmContainer.querySelectorAll('td.asignatura__normal').forEach(celda => {
            const id = celda.getAttribute('id');
            if (id && id !== '0' && cpmData[id]) {
              const holgura = cpmData[id].slack;
              if (holgura === 0) {
                celda.classList.add('cpm-critico');
              } else {
                celda.classList.add('cpm-flexible');
              }
            }
          });
          cpmCalculated = true;
        }
      }
    } else {
      // Volver a la vista normal
      malla.style.display = 'block';
      cpmContainer.style.display = 'none';
      netUI.style.display = 'none';

      this.innerText = 'Ver Cuellos de Botella (CPM)';
      this.style.backgroundColor = '#dc3545';
    }
  });

  document.getElementById('btnToggleSettings').addEventListener('click', function () {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'flex' : 'none';
  });

  // --- Lógicas I.O. en el Grafo ---
  document.getElementById('btnGraphCPM').addEventListener('click', function () {
    if (!network) return;
    const cpmData = calcularCPM(); // Reutiliza la función ya creada
    const dsNodes = network.body.data.nodes;

    dsNodes.get().forEach(node => {
      if (cpmData[node.id]) {
        const slack = cpmData[node.id].slack;
        if (slack === 0) {
          // Cuello de Botella
          dsNodes.update({
            id: node.id,
            color: { background: '#ffe6e6', border: '#ff0000' },
            borderWidth: 4,
            shadow: { enabled: true, color: 'red', size: 15, x: 0, y: 0 },
            font: { color: '#000' }
          });
        } else {
          // Flexible
          dsNodes.update({
            id: node.id,
            color: { background: 'rgba(200,200,200,0.4)', border: 'rgba(150,150,150,0.4)' },
            borderWidth: 1,
            shadow: { enabled: false },
            font: { color: 'rgba(50,50,50,0.5)' }
          });
        }
      }
    });
  });

  document.getElementById('btnGraphOpt').addEventListener('click', function () {
    if (!network) return;
    const dsNodes = network.body.data.nodes;
    const dsEdges = network.body.data.edges;
    let allNodes = dsNodes.get();

    // 0. Filtrado por Mención (Major/Minor Model)
    const mencion = document.getElementById('selectMencion').value;
    if (mencion !== 'general') {
      let nodosAEliminar = [];
      allNodes.forEach(n => {
        // Solo descartamos ramos avanzados (nivel_profundidad 3) que no son protegidos
        if (n._nivel_profundidad === 3 && !n._esProtegido) {
          let hasGestion = n._competencias.includes('gestion') || n._competencias.includes('economia');
          let hasFisicaAvanzada = n._competencias.includes('electromagnetismo') || n._competencias.includes('termodinamica');
          let hasSostenibilidad = n._competencias.includes('humanidades');

          // Filtrar según la mención elegida
          if (mencion === 'economia' && (hasFisicaAvanzada || hasSostenibilidad)) nodosAEliminar.push(n.id);
          if (mencion === 'fisica' && (hasGestion || hasSostenibilidad)) nodosAEliminar.push(n.id);
          if (mencion === 'sostenibilidad' && (hasFisicaAvanzada || hasGestion)) nodosAEliminar.push(n.id);
        }
      });

      // Reconectar dependencias (Bypass) antes de eliminar para no romper el DAG
      nodosAEliminar.forEach(idEliminar => {
        let reqs = dsEdges.get().filter(e => e.to === idEliminar).map(e => e.from);
        let succs = dsEdges.get().filter(e => e.from === idEliminar).map(e => e.to);
        
        reqs.forEach(r => {
          succs.forEach(s => {
            if (r !== s) dsEdges.add({ id: `${r}-${s}-bypass`, from: r, to: s, arrows: 'to', color: { color: '#aaa', highlight: '#333' } });
          });
        });

        // Eliminar nodo y sus aristas
        let edgesToRemove = dsEdges.get().filter(e => e.from === idEliminar || e.to === idEliminar).map(e => e.id);
        dsEdges.remove(edgesToRemove);
        dsNodes.remove(idEliminar);
      });
      
      // Actualizamos allNodes después de la purga
      allNodes = dsNodes.get();
    }

    // 1. Configuración de Jaccard y Carga Dinámica
    const jaccardSetting = document.getElementById('selectJaccard').value;
    let threshold = 2.0; // Desactivado por defecto
    let maxLoad = 26; // Carga muy alta si no fusionamos (para que el DAG no colapse)

    if (jaccardSetting === 'full') {
       threshold = 0.75;
       maxLoad = 12; // Muy comprimido, ideal para fusión
    } else if (jaccardSetting === 'light') {
       threshold = 0.90;
       maxLoad = 18; // Punto medio
    }

    // 1.5 Fusión por Jaccard
    let fused = new Set();
    if (jaccardSetting !== 'none') {
      for (let i = 0; i < allNodes.length; i++) {
        for (let j = i + 1; j < allNodes.length; j++) {
          let n1 = allNodes[i];
          let n2 = allNodes[j];
          if (fused.has(n1.id) || fused.has(n2.id)) continue;
          if (n1._esProtegido || n2._esProtegido) continue; // Regla Crítica: Intocables
          if (n1._nivel_profundidad !== n2._nivel_profundidad) continue; // Regla Crítica: Mismo nivel_profundidad EXACTO

          // Similitud Jaccard
          let inter = n1._competencias.filter(c => n2._competencias.includes(c));
          let union = new Set([...n1._competencias, ...n2._competencias]);
          let jaccard = inter.length / union.size;

          if (jaccard >= threshold) {
          // Límite de Fusión: no absorber más de 3 ramos
          if (!n1._fusionCount) n1._fusionCount = 1;
          if (!n2._fusionCount) n2._fusionCount = 1;
          if (n1._fusionCount + n2._fusionCount > 3) continue;

          if (!n1._creditos) n1._creditos = 5; // Asumimos 5 por defecto
          if (!n2._creditos) n2._creditos = 5;

          // Diccionario de Super-Nodos (Nombres Inteligentes)
          function getSmartName(compArray) {
            const cSet = new Set(compArray);
            if (cSet.has('calculo') && cSet.has('ecuaciones')) return "Matemáticas Aplicadas a la Ingeniería";
            if (cSet.has('calculo')) return "Cálculo Diferencial e Integral";
            if (cSet.has('algebra')) return "Álgebra Lineal y Matemática Discreta";
            if (cSet.has('fisica') && cSet.has('mecanica')) return "Física para Sistemas Computacionales";
            if (cSet.has('electromagnetismo') || cSet.has('termodinamica')) return "Señales y Sistemas Físicos";
            if (cSet.has('programacion') && !cSet.has('poo')) return "Fundamentos de Algoritmia y Estructuras";
            if (cSet.has('poo')) return "Arquitectura de Software y Paradigmas";
            if (cSet.has('datos') || cSet.has('web')) return "Ingeniería de Datos y Sistemas Web";
            if (cSet.has('humanidades')) return "Ética y Sostenibilidad Tecnológica";
            if (cSet.has('gestion')) return "Formulación y Gestión de Proyectos TI";

            let fallback = compArray[0] || 'Ingeniería';
            return "Módulo Integrado de " + fallback.charAt(0).toUpperCase() + fallback.slice(1);
          }

          // Fusionar n2 en n1
          n1._fusionCount += n2._fusionCount;
          n1._creditos += n2._creditos;
          n1._dificultad = (n1._dificultad + n2._dificultad) / 2;

          // Unir competencias para el nombre inteligente
          n1._competencias = Array.from(union);
          let smartName = getSmartName(n1._competencias);
          n1.label = `<b>${smartName}</b>\n(Créditos Totales: ${n1._creditos})`;

          n1.color = { background: '#e0f7fa', border: '#00bcd4' }; // Azul muy suave y elegante
          n1.borderWidth = 3;

          // Reasignar aristas de n2 a n1 (Asegurar DAG)
          let edgesToUpdate = [];
          dsEdges.get().forEach(edge => {
            if (edge.from === n2.id && edge.to !== n1.id) edgesToUpdate.push({ id: edge.id, from: n1.id });
            if (edge.to === n2.id && edge.from !== n1.id) edgesToUpdate.push({ id: edge.id, to: n1.id });
          });
          dsEdges.update(edgesToUpdate);

          dsNodes.update(n1);
          dsNodes.remove(n2.id);
          fused.add(n2.id);
        }
      }
    }
    } // Fin condicional Jaccard

    // 2. Ordenamiento Topológico y Asignación de Semestres (CRÍTICO)
    allNodes = dsNodes.get();
    let currentEdges = dsEdges.get();

    // Estructuras de grafos
    let adjList = {};
    let inDegree = {};
    allNodes.forEach(n => {
      adjList[n.id] = [];
      inDegree[n.id] = 0;
    });

    currentEdges.forEach(e => {
      if (adjList[e.from] && inDegree[e.to] !== undefined) {
        adjList[e.from].push(e.to);
        inDegree[e.to]++;
      }
    });

    let semesterLoads = {}; // sumatoria de dificultad por semestre asignado
    let nodeSemester = {};  // id -> semestre
    let readyQueue = [];

    // Nodos iniciales (sin prerrequisitos)
    allNodes.forEach(n => {
      if (inDegree[n.id] === 0) readyQueue.push(n);
    });

    function getMinSemester(nivel) {
      if (nivel === 1) return 1; // Nivelación empieza en S1
      if (nivel === 2) return 2; // Regla Crítica: Ciencias básicas NUNCA en S1
      if (nivel === 3) return 3; // Avanzados empiezan en 3+
      if (nivel === 4) return 7; // Titulación/Prácticas SOLO en S7
      return 1;
    }

    let unassigned = allNodes.length;

    // Algoritmo de Kahn Modificado para Proceso de Bolonia (Max 7 Semestres)
    while (readyQueue.length > 0 && unassigned > 0) {
      // Ordenamos la cola para priorizar los de menor nivel_profundidad (Regla de Jerarquía)
      readyQueue.sort((a, b) => {
        if (a._nivel_profundidad !== b._nivel_profundidad) return a._nivel_profundidad - b._nivel_profundidad;
        return b._dificultad - a._dificultad;
      });

      let node = readyQueue.shift();

      // Regla 1: Precedencia (S > max(S_prereq))
      let maxPreReqSem = 0;
      currentEdges.forEach(e => {
        if (e.to === node.id && nodeSemester[e.from]) {
          if (nodeSemester[e.from] > maxPreReqSem) {
            maxPreReqSem = nodeSemester[e.from];
          }
        }
      });

      // Calculamos el semestre mínimo permitido combinando precedencia y nivel de profundidad
      let minS = Math.max(maxPreReqSem + 1, getMinSemester(node._nivel_profundidad));

      // Regla de Oro: El semestre 1 es exclusivo para nivel_profundidad 1 y sin pre-requisitos
      if (minS === 1 && (node._nivel_profundidad !== 1 || maxPreReqSem > 0)) {
        minS = 2;
      }

      // Regla 3: Balance de Carga Dinámico, techo S=7
      let assignedS = minS;
      while (assignedS < 7) {
        let currentLoad = semesterLoads[assignedS] || 0;
        if (currentLoad + node._dificultad <= maxLoad || currentLoad === 0) {
          break;
        }
        assignedS++;
      }

      // Regla Extremo Derecho: Forzar Titulación/Prácticas a S7
      if (node._nivel_profundidad === 4) {
        assignedS = 7;
      }

      // Comprimir todo al límite de 7 para cumplir el estándar de Bolonia
      if (assignedS > 7 && node._nivel_profundidad !== 4) {
        assignedS = 7;
      }

      // Registrar asignación
      nodeSemester[node.id] = assignedS;
      semesterLoads[assignedS] = (semesterLoads[assignedS] || 0) + node._dificultad;
      unassigned--;

      // Actualizar el nodo en Vis.js usando Grid Layout Manual
      let currentX = assignedS * 350;
      let currentY = (node._originalRow || 0) * 120;
      
      // Lógica simple anti-colisión: si la casilla (x,y) ya está ocupada por otro nodo procesado, bajarlo
      let overlap = true;
      let antiInfinite = 0;
      while (overlap && antiInfinite < 20) {
        overlap = false;
        allNodes.forEach(n => {
           if (n.id !== node.id && n.x === currentX && n.y === currentY) {
              overlap = true;
              currentY += 120; // Bajar a la siguiente fila
           }
        });
        antiInfinite++;
      }
      
      node.x = currentX;
      node.y = currentY;
      dsNodes.update({ id: node.id, x: node.x, y: node.y });

      // Liberar sucesores (Reducir inDegree)
      adjList[node.id].forEach(successorId => {
        inDegree[successorId]--;
        if (inDegree[successorId] === 0) {
          let sucNode = allNodes.find(n => n.id === successorId);
          if (sucNode) readyQueue.push(sucNode);
        }
      });
    }

    // CRÍTICO: Forzar a Vis.js a recalcular y re-renderizar la jerarquía visual
    network.setData({ nodes: dsNodes, edges: dsEdges });
  });