document.querySelectorAll('td.asignatura__normal').forEach(celda => {
  // Guardar el title original antes de borrarlo para poder leer los datos después
  if (celda.getAttribute('title')) {
    celda.setAttribute('data-title', celda.getAttribute('title'));
  }
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

      let colorObj = { background: '#ffffff', border: '#444' }; // Todo blanco, borde oscuro sutil

      // --- Extracción de Datos Reales desde el atributo 'title' ---
      const titleAttr = celda.getAttribute('data-title') || celda.getAttribute('title') || "";
      let creditos = 5; // Fallback
      const creditosMatch = titleAttr.match(/Cr[eé]ditos\s*:\s*(\d+)/i);
      if (creditosMatch) {
        creditos = parseInt(creditosMatch[1]);
      }

      let hrsCatedra = 0, hrsTaller = 0, hrsLab = 0;
      const hrsMatch = titleAttr.match(/Catedra\s*:\s*(\d+)\s*Taller\s*:\s*(\d+)\s*Laboratorio\s*:\s*(\d+)/i);
      if (hrsMatch) {
        hrsCatedra = parseInt(hrsMatch[1]);
        hrsTaller = parseInt(hrsMatch[2]);
        hrsLab = parseInt(hrsMatch[3]);
      }

      const nm = nombre.toUpperCase();
      let esProtegido = false;

      // Exclusión de Intocables: Inglés, Prácticas, Titulación
      if (nm.includes('INGLES') || nm.includes('INGLÉS') || nm.includes('PRACTICA') || nm.includes('PRÁCTICA') || nm.includes('TITULACION') || nm.includes('TITULACIÓN') || nm.includes('MEMORIA') || nm.includes('TRABAJO DE TITULO')) {
        esProtegido = true;
      }

      // Asignación de Área de Conocimiento (Reemplaza a las competencias/Jaccard)
      let area = 'General';
      if (nm.includes('CALCULO') || nm.includes('CÁLCULO') || nm.includes('ALGEBRA') || nm.includes('ÁLGEBRA') || nm.includes('ECUACION') || nm.includes('MATEMATICA')) area = 'Matematicas';
      else if (nm.includes('FISICA') || nm.includes('FÍSICA') || nm.includes('MECANICA') || nm.includes('TERMO') || nm.includes('ELECTRO')) area = 'Fisica';
      else if (nm.includes('PROGRAMACION') || nm.includes('PROGRAMACIÓN') || nm.includes('PROG') || nm.includes('OBJETOS') || nm.includes('SOFTWARE')) area = 'Programacion';
      else if (nm.includes('BASE DE DATOS') || nm.includes('DATOS') || nm.includes('WEB')) area = 'Tecnologias';
      else if (nm.includes('PROYECTO') || nm.includes('EMPRESA') || nm.includes('GESTION') || nm.includes('GESTIÓN') || nm.includes('ECONOMIA')) area = 'Gestion';
      else if (nm.includes('SOCIEDAD') || nm.includes('ETICA') || nm.includes('ÉTICA') || nm.includes('INGLES') || nm.includes('HUMANIDADES')) area = 'Humanidades';

      // Asignación de Nivel de Profundidad (CRÍTICO: 1 al 4)
      let nivel_profundidad = 3; // Avanzados por defecto
      if (esProtegido && (nm.includes('TITULACION') || nm.includes('TITULACIÓN') || nm.includes('MEMORIA') || nm.includes('PRACTICA') || nm.includes('PRÁCTICA'))) {
        nivel_profundidad = 4; // Titulación/Prácticas Finales
      } else if (semestre <= 2 || nm.includes('INTRO') || nm.includes('FUNDAMENTO')) {
        nivel_profundidad = 1; // Introducciones (Prioridad máxima para anclar a S1/S2)
      }

      let rowIndex = 0;
      let tr = celda.closest('tr');
      if (tr && tr.parentNode) rowIndex = Array.from(tr.parentNode.children).indexOf(tr);

      nodes.add({
        id: id,
        label: `<b>${codigo}</b>\n${nombre}\n<i>( ${hrsCatedra},${hrsTaller},${hrsLab} ) (${creditos})</i>`,
        title: `Área: ${area}`, // El resto ya está visible
        x: semestre * 450,
        y: rowIndex * 120,
        level: semestre,
        color: colorObj,
        shape: 'box',
        margin: { top: 15, bottom: 15, left: 20, right: 20 },
        font: { multi: 'html', size: 16, face: 'system-ui, sans-serif' },
        shadow: { enabled: true, color: 'rgba(0,0,0,0.15)', size: 10, x: 5, y: 5 },
        // Metadatos I.O.
        _creditos: creditos,
        _areaConocimiento: area,
        _hrsCatedra: hrsCatedra,
        _hrsTaller: hrsTaller,
        _hrsLab: hrsLab,
        _esProtegido: esProtegido,
        _originalColor: colorObj,
        _originalRow: rowIndex,
        _nivel_profundidad: nivel_profundidad,
        _excepciones: (celda.getAttribute('excepciones') || '').toUpperCase(),
        _asicodigo: celda.getAttribute('asicodigo') || ''
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
        layout: { hierarchical: false }, // Apagamos la jerarquía, usamos la Grilla Absoluta (X, Y)
        physics: { enabled: false }, // Sin físicas libres, fijos a sus coordenadas
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

      // --- Dibujar cabeceras de columnas (Semestres) y sumatorias en el Canvas ---
      network.on("afterDrawing", function (ctx) {
        ctx.textAlign = "center";

        // Calcular sumatorias dinámicamente según posiciones actuales
        const stats = {};
        const positions = network.getPositions();

        let globalMinY = Infinity;

        let maxSemX = 10;
        Object.keys(positions).forEach(id => {
          const x = positions[id].x;
          const y = positions[id].y;
          let semIndex = Math.round(x / 450);
          if (semIndex > maxSemX) maxSemX = semIndex;
          if (semIndex <= 0) semIndex = 1;

          if (!stats[semIndex]) stats[semIndex] = { creditos: 0, horas: 0, minY: y };
          if (y < stats[semIndex].minY) stats[semIndex].minY = y;
          if (y < globalMinY) globalMinY = y;

          const nodeData = data.nodes.get(id);
          if (nodeData) {
            stats[semIndex].creditos += (nodeData._creditos || 0);
            stats[semIndex].horas += (nodeData._hrsCatedra || 0) + (nodeData._hrsTaller || 0) + (nodeData._hrsLab || 0);
          }
        });

        for (let sem = 1; sem <= maxSemX; sem++) {
          const x = sem * 450;
          const y = globalMinY - 140; // Alineación horizontal perfecta para todos los semestres

          // Dibujar fondo blanco sutil para asegurar contraste
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillRect(x - 90, y - 25, 180, 100);

          // Borde del fondo
          ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 90, y - 25, 180, 100);

          // Texto del semestre (I, II, III...)
          const romanos = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
          const semStr = romanos[sem] || sem;

          ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
          ctx.fillStyle = "#0056b3"; // Azul vibrante
          ctx.fillText(semStr, x, y + 5);

          if (stats[sem]) {
            ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#111111"; // Casi negro fuerte
            ctx.fillText(`Créditos: ${stats[sem].creditos}`, x, y + 35);
            ctx.font = "15px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#333333";
            ctx.fillText(`Horas: ${stats[sem].horas}`, x, y + 55);

            // Dibujar una línea separadora fuerte
            ctx.beginPath();
            ctx.moveTo(x - 70, y + 68);
            ctx.lineTo(x + 70, y + 68);
            ctx.strokeStyle = "#0056b3";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#dc3545"; // Rojo
            ctx.fillText("¡Eliminado!", x, y + 45);
            ctx.font = "italic 13px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#dc3545";
            ctx.fillText("(Optimizado)", x, y + 65);
          }
        }
      });
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
let cpmGraphActive = false;
document.getElementById('btnGraphCPM').addEventListener('click', function () {
  if (!network) return;
  const dsNodes = network.body.data.nodes;

  if (!cpmGraphActive) {
    const cpmData = calcularCPM(); // Reutiliza la función ya creada

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

    this.innerText = 'Ocultar Cuellos de Botella';
    this.style.backgroundColor = '#6c757d'; // Gris
    cpmGraphActive = true;

  } else {
    // Restaurar el grafo a la normalidad
    dsNodes.get().forEach(node => {
      dsNodes.update({
        id: node.id,
        color: node._originalColor || { background: '#ffffff', border: '#444' },
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.15)', size: 10, x: 5, y: 5 },
        font: { color: '#000' }
      });
    });

    this.innerText = 'Ver Cuellos de Botella (CPM)';
    this.style.backgroundColor = '#dc3545'; // Rojo
    cpmGraphActive = false;
  }
});

document.getElementById('btnGraphOpt').addEventListener('click', function () {
  if (!network) return;
  const dsNodes = network.body.data.nodes;
  const dsEdges = network.body.data.edges;
  let allNodes = dsNodes.get();

  // Guardar estadísticas originales antes de mutar la red
  const originalAllNodesCount = allNodes.length;
  const totalOriginalCreds = allNodes.reduce((acc, n) => acc + (n._creditos || 0), 0);
  const originalSemesters = Math.max(...allNodes.map(n => n.level));

  // 0. Filtrado por Mención (Major/Minor Model) y Eximición
  const mencion = document.getElementById('selectMencion').value;
  const eximirIngles = document.getElementById('chkEximicionIngles') && document.getElementById('chkEximicionIngles').checked;

  let nodosAEliminar = [];
  allNodes.forEach(n => {
    let lbl = n.label.toUpperCase();
    let isIngles = lbl.includes('INGLES') || lbl.includes('INGLÉS');

    if (eximirIngles && isIngles) {
      if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id);
    }

    if (mencion !== 'general' && !n._esProtegido) {
      let hasGestion = n._areaConocimiento === 'Gestion' || lbl.includes('GESTION') || lbl.includes('GESTIÓN') || lbl.includes('PROYECTO') || lbl.includes('EMPRENDIMIENTO') || lbl.includes('NEGOCIOS') || lbl.includes('ECONOMIA') || lbl.includes('ECONOMÍA');
      let hasFisica = n._areaConocimiento === 'Fisica' || lbl.includes('QUIMICA') || lbl.includes('QUÍMICA') || lbl.includes('FISICA') || lbl.includes('FÍSICA') || lbl.includes('MECANICA') || lbl.includes('MECÁNICA');
      let hasSostenibilidad = n._areaConocimiento === 'Humanidades' || lbl.includes('SOSTENIBILIDAD') || lbl.includes('AMBIENTE') || lbl.includes('ETICA') || lbl.includes('ÉTICA') || lbl.includes('SOCIEDAD');

      // Filtrar según la mención elegida
      if (mencion === 'economia' && (hasFisica || hasSostenibilidad)) if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id);
      if (mencion === 'fisica' && (hasGestion || hasSostenibilidad)) if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id);
      if (mencion === 'sostenibilidad' && (hasFisica || hasGestion)) if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id);
    }
  });

  if (nodosAEliminar.length > 0) {
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

  // 1. Ordenamiento Topológico y Asignación de Semestres (CRÍTICO)
  allNodes = dsNodes.get();
  let inDegree = {};
  let outEdges = {};
  let adjList = {};

  // Identificar ramos de cierre (Prácticas, Formulación, Titulación) que flotan al final
  let closingNodeIds = allNodes.filter(n => {
    let lbl = n.label.toUpperCase();
    if (lbl.includes('INTRODUCCION') || lbl.includes('INTRODUCCIÓN')) return false; // Evitar IT004
    return lbl.includes('PRACTICA PROFESIONAL') || lbl.includes('PRÁCTICA PROFESIONAL') ||
      lbl.includes('FORMULACION DE PROYECTO DE TITULACION') || lbl.includes('FORMULACIÓN DE PROYECTO DE TITULACIÓN') ||
      lbl.includes('ACTIVIDAD DE TITULACION') || lbl.includes('ACTIVIDAD DE TITULACIÓN');
  }).map(n => n.id);

  // Inicializar estructuras solo para nodos ACTIVOS (no eliminados)
  let activeNodes = allNodes.filter(n => !nodosAEliminar.includes(n.id));
  activeNodes.forEach(n => {
    inDegree[n.id] = 0;
    outEdges[n.id] = [];
    adjList[n.id] = [];
  });

  let currentEdges = dsEdges.get();
  currentEdges.forEach(e => {
    // Ignorar co-requisitos (flechas punteadas) en la estructura del DAG para evitar ciclos infinitos
    if (!e.dashes && adjList[e.from] !== undefined && inDegree[e.to] !== undefined) {
      adjList[e.from].push(e.to);
      outEdges[e.from].push(e.to);
      inDegree[e.to]++;
    }
  });

  let nodeSemester = {};
  let semesterLoads = {}; // { semestre: creditos_acumulados }
  let readyQueue = [];
  let semCounts = {};     // cantidad de ramos por semestre para apilar verticalmente
  let maxSemesters = 10;
  // Calcular carga ideal para balancear la malla y evitar aglomeraciones al inicio
  let totalActiveCreds = activeNodes.reduce((acc, n) => acc + (n._creditos || 5), 0);
  // Asumimos que queremos distribuir los créditos en (originalSemesters - 2) o similar
  let idealSemesters = Math.max(1, originalSemesters - 2); 
  let targetLoad = Math.ceil(totalActiveCreds / idealSemesters);
  
  // maxLoad dinámico: no menos de 28 ni más de 40.
  let maxLoad = Math.min(40, Math.max(28, targetLoad));

  // Identificar nodos sin dependencias (Raíces) que NO sean de cierre
  activeNodes.forEach(n => {
    if (inDegree[n.id] === 0 && !closingNodeIds.includes(n.id)) {
      readyQueue.push(n);
    }
  });

  let unassigned = activeNodes.length - closingNodeIds.length;
  let activeCreds = activeNodes.reduce((acc, n) => acc + (n._creditos || 0), 0);
  let estimatedOptimizedSemesters = Math.max(1, Math.ceil(activeCreds / maxLoad));

  // Algoritmo de Kahn Modificado con Límite de Carga
  while (readyQueue.length > 0 && unassigned > 0) {
    // Ordenamos la cola para priorizar los ramos que originalmente estaban antes en la malla
    readyQueue.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return (b._creditos || 0) - (a._creditos || 0); // Priorizar los más pesados primero
    });

    let node = readyQueue.shift();

    // Calcular el semestre mínimo basado en los pre-requisitos de este nodo
    let maxPreReqSem = 0;
    currentEdges.forEach(e => {
      if (e.to === node.id && nodeSemester[e.from]) {
        // Leer la excepción directamente desde el HTML del usuario
        let fromNode = allNodes.find(n => n.id === e.from);
        let ignorar = false;
        if (node._excepciones && fromNode) {
          if (node._excepciones.includes(fromNode.id.toString()) ||
            (fromNode._asicodigo && node._excepciones.includes(fromNode._asicodigo.toUpperCase()))) {
            ignorar = true;
          }
        }

        // --- Reglas Duras E_flex del Modelo Optimizador (Investigación Operativa) ---
        if (fromNode) {
          let fLbl = fromNode.label.toUpperCase();
          let tLbl = node.label.toUpperCase();

          // 1. Investigación Operativa (to) y Álgebra Lineal (from)
          if (tLbl.includes('INVESTIGACION OPERATIVA') && fLbl.includes('ALGEBRA LINEAL')) ignorar = true;
          if (tLbl.includes('INVESTIGACIÓN OPERATIVA') && fLbl.includes('ÁLGEBRA LINEAL')) ignorar = true;

          // 2. Estadística Computacional (to) y Estadística y Probabilidad (from)
          if (tLbl.includes('ESTADISTICA COMPUTACIONAL') && fLbl.includes('ESTADISTICA Y PROBABILIDAD')) ignorar = true;
          if (tLbl.includes('ESTADÍSTICA COMPUTACIONAL') && fLbl.includes('ESTADÍSTICA Y PROBABILIDAD')) ignorar = true;

          // 3. Seguridad de la Información (to) y Laboratorio de Redes (from)
          if (tLbl.includes('SEGURIDAD DE LA INFORMACION') && fLbl.includes('LABORATORIO DE REDES')) ignorar = true;
          if (tLbl.includes('SEGURIDAD DE LA INFORMACIÓN') && fLbl.includes('LABORATORIO DE REDES')) ignorar = true;

          // 4. Inteligencia Artificial (to) y Estadística Computacional (from)
          if (tLbl.includes('INTELIGENCIA ARTIFICIAL') && fLbl.includes('ESTADISTICA COMPUTACIONAL')) ignorar = true;
          if (tLbl.includes('INTELIGENCIA ARTIFICIAL') && fLbl.includes('ESTADÍSTICA COMPUTACIONAL')) ignorar = true;
        }

        if (!ignorar) {
          let requiredSem = e.dashes ? nodeSemester[e.from] - 1 : nodeSemester[e.from];
          if (requiredSem > maxPreReqSem) {
            maxPreReqSem = requiredSem;
          }
        }
      }
    });

    // El semestre mínimo lo dicta la pura precedencia topológica (+1 para pre-requisitos estrictos)
    let minS = maxPreReqSem + 1;

    // Regla de Conservación Proporcional (Restaurada y Mejorada)
    // Evita que asignaturas avanzadas caigan al inicio de la carrera, arruinando la lógica académica.
    let propMinS = 1;
    let originalSemestersSinTit = originalSemesters - 1;
    if (originalSemestersSinTit >= 1) {
      let estOptSinTit = idealSemesters;
      propMinS = Math.round((node.level / originalSemestersSinTit) * estOptSinTit);
      
      // Permitimos un "colchón" de compresión de 1 semestre hacia la izquierda
      propMinS = Math.max(1, propMinS - 1);
      
      // Excepción: Ramos introductorios siempre pueden ir al primer semestre si hay espacio
      if (node.level <= 2) propMinS = 1;
    }
    
    // Aplicar la restricción conservando el orden lógico
    minS = Math.max(minS, propMinS);

    // Regla 3: Balance de Carga Dinámico (Usando Créditos)
    let assignedS = minS;
    while (assignedS < maxSemesters) {
      let currentLoad = semesterLoads[assignedS] || 0;
      let nodeCreds = node._creditos || 5;
      if (currentLoad + nodeCreds <= maxLoad || currentLoad === 0) {
        break;
      }
      assignedS++;
    }

    // Comprimir todo al límite establecido (Bolonia u original)
    if (assignedS > maxSemesters && node._nivel_profundidad !== 4) {
      assignedS = maxSemesters;
    }

    // Asignar al semestre y actualizar carga
    nodeSemester[node.id] = assignedS;
    if (!semesterLoads[assignedS]) semesterLoads[assignedS] = 0;
    semesterLoads[assignedS] += (node._creditos || 5);
    unassigned--;

    // Liberar sucesores (Reducir inDegree)
    if (adjList[node.id]) {
      adjList[node.id].forEach(successorId => {
        inDegree[successorId]--;
        if (inDegree[successorId] === 0 && !closingNodeIds.includes(successorId)) {
          let sucNode = allNodes.find(n => n.id === successorId);
          if (sucNode) readyQueue.push(sucNode);
        }
      });
    }
  }

  // --- POSPROCESAMIENTO: ASIGNACIÓN RELATIVA DE CIERRES ---
  // Encontramos el último semestre normal generado
  let N = Object.values(nodeSemester).length > 0 ? Math.max(...Object.values(nodeSemester)) : 10;

  // Las actividades de cierre no tienen requisitos y van "por fuera" (sin afectar maxLoad)
  closingNodeIds.forEach(id => {
    let n = allNodes.find(n => n.id === id);
    if (!n) return;
    let lbl = n.label.toUpperCase();

    if (lbl.includes('ACTIVIDAD DE TITULACION') || lbl.includes('ACTIVIDAD DE TITULACIÓN')) {
      nodeSemester[id] = N + 1; // Lo último siempre
    } else if (lbl.includes('FORMULACION DE PROYECTO') || lbl.includes('FORMULACIÓN DE PROYECTO')) {
      nodeSemester[id] = N; // Un semestre antes de la titulación
    } else if (lbl.includes('PRACTICA PROFESIONAL II') || lbl.includes('PRÁCTICA PROFESIONAL II')) {
      nodeSemester[id] = N; // En el semestre específico previo al final (originalmente S9 de 10)
    } else if (lbl.includes('PRACTICA PROFESIONAL I') || lbl.includes('PRÁCTICA PROFESIONAL I')) {
      nodeSemester[id] = Math.max(1, N - 2); // Dos semestres antes de la P2 (originalmente S7 respecto a S9)
    }
  });

  // Agrupar nodos por semestre asignado
  let nodesBySemester = {};
  activeNodes.forEach(node => {
    let assignedS = nodeSemester[node.id];
    if (assignedS === undefined) {
      assignedS = maxSemesters; // Fallback
      nodeSemester[node.id] = assignedS;
    }
    if (!nodesBySemester[assignedS]) nodesBySemester[assignedS] = [];
    nodesBySemester[assignedS].push(node);
  });

  // Asignar coordenadas (X = semestre, Y = apilamiento ordenado)
  // Para no dejar "agujeros en blanco", apilamos (0, 120, 240...) pero
  // respetando el orden vertical original (Math arriba, Prog abajo)
  Object.keys(nodesBySemester).forEach(sem => {
    let nodosEnSemestre = nodesBySemester[sem];
    // Ordenar por su Y original para preservar los flujos visuales
    nodosEnSemestre.sort((a, b) => a.y - b.y);

    nodosEnSemestre.forEach((node, index) => {
      node.x = parseInt(sem) * 450;
      node.y = index * 120; // Apilado sin agujeros
      dsNodes.update({ id: node.id, x: node.x, y: node.y, level: parseInt(sem) });
    });
  });

  network.setData({ nodes: dsNodes, edges: dsEdges });

  let totalOptimizedCreds = allNodes.reduce((acc, n) => acc + (n._creditos || 0), 0);
  let optimizedSemesters = Object.values(nodeSemester).length > 0 ? Math.max(...Object.values(nodeSemester)) : 0;

  let statsPnl = document.getElementById('statsPanel');
  if (!statsPnl) {
    statsPnl = document.createElement('div');
    statsPnl.id = 'statsPanel';
    statsPnl.setAttribute('style', "position: absolute; top: 80px; right: 20px; z-index: 1002; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.2); width: 320px; display: none; flex-direction: column; font-family: sans-serif;");
    statsPnl.innerHTML = `
         <h3 style="margin-top:0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; font-size: 16px;">Dashboard de Optimización</h3>
         <div id="statsContent" style="font-size: 14px; color: #444; line-height: 1.6;"></div>
       `;
    document.body.appendChild(statsPnl);
  }

  document.getElementById('statsContent').innerHTML = `
      <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #ccc; padding-bottom:5px; margin-bottom:5px;">
        <strong>Ramos Activos:</strong>
        <span style="color:#666;"><del>${originalAllNodesCount}</del> ➔ <b style="color:#28a745;">${allNodes.length}</b></span>
      </div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #ccc; padding-bottom:5px; margin-bottom:5px;">
        <strong>Créditos Totales:</strong>
        <span style="color:#666;"><del>${totalOriginalCreds}</del> ➔ <b style="color:#28a745;">${totalOptimizedCreds}</b></span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <strong>Duración (Semestres):</strong>
        <span style="color:#666;"><del>${originalSemesters}</del> ➔ <b style="color:#28a745;">${optimizedSemesters}</b></span>
      </div>
    `;
  statsPnl.style.display = 'flex';
});