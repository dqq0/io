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

document.getElementById('btnExportPython').addEventListener('click', function () {
  if (!network) return;
  aplicarOptimizacionGraph(true);
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


function aplicarOptimizacionGraph(animar) {
  if (!network) return;
  const dsNodes = network.body.data.nodes;
  const dsEdges = network.body.data.edges;
  let allNodes = dsNodes.get();

  const originalAllNodesCount = allNodes.length;
  const totalOriginalCreds = allNodes.reduce((acc, n) => acc + (n._creditos || 0), 0);
  const originalSemesters = Math.max(...allNodes.map(n => n.level));

  const mencion = document.getElementById('selectMencion').value;
  const eximirIngles = document.getElementById('chkEximicionIngles') && document.getElementById('chkEximicionIngles').checked;
  const puntajeDestacado = document.getElementById('chkPuntajeIngreso') && document.getElementById('chkPuntajeIngreso').checked;

  let nodosAEliminar = [];
  let nodosMencion = [];

  allNodes.forEach(n => {
    let lbl = n.label.toUpperCase();
    let isIngles = lbl.includes('INGLES') || lbl.includes('INGLÉS');
    let isIntroCiencias = (lbl.includes('INTRODUCCION') || lbl.includes('INTRODUCCIÓN')) && 
                          (lbl.includes('CALCULO') || lbl.includes('CÁLCULO') || lbl.includes('ALGEBRA') || lbl.includes('ÁLGEBRA') || lbl.includes('FISICA') || lbl.includes('FÍSICA') || lbl.includes('QUIMICA') || lbl.includes('QUÍMICA') || lbl.includes('CIENCIAS'));
    let isIntroProyectos = lbl.includes('PROYECTO');

    if (eximirIngles && isIngles) {
      if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id);
    }

    if (puntajeDestacado && isIntroCiencias && !isIntroProyectos) {
      if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id);
    }

    if (mencion !== 'general' && !n._esProtegido) {
      let hasGestion = n._areaConocimiento === 'Gestion' || lbl.includes('GESTION') || lbl.includes('GESTIÓN') || lbl.includes('PROYECTO') || lbl.includes('EMPRENDIMIENTO') || lbl.includes('NEGOCIOS') || lbl.includes('ECONOMIA') || lbl.includes('ECONOMÍA');
      let hasFisica = n._areaConocimiento === 'Fisica' || lbl.includes('QUIMICA') || lbl.includes('QUÍMICA') || lbl.includes('FISICA') || lbl.includes('FÍSICA') || lbl.includes('MECANICA') || lbl.includes('MECÁNICA');
      let hasSostenibilidad = n._areaConocimiento === 'Humanidades' || lbl.includes('SOSTENIBILIDAD') || lbl.includes('AMBIENTE') || lbl.includes('ETICA') || lbl.includes('ÉTICA') || lbl.includes('SOCIEDAD');

      if (mencion === 'economia') {
         if (hasFisica || hasSostenibilidad) { if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id); }
         else if (hasGestion) { nodosMencion.push(n.id); }
      }
      if (mencion === 'fisica') {
         if (hasGestion || hasSostenibilidad) { if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id); }
         else if (hasFisica) { nodosMencion.push(n.id); }
      }
      if (mencion === 'sostenibilidad') {
         if (hasFisica || hasGestion) { if (!nodosAEliminar.includes(n.id)) nodosAEliminar.push(n.id); }
         else if (hasSostenibilidad) { nodosMencion.push(n.id); }
      }
    }
  });

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

  const updateDashboard = (nodes, creds, semesters, finished = false) => {
    document.getElementById('statsContent').innerHTML = `
      <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #ccc; padding-bottom:5px; margin-bottom:5px;">
        <strong>Ramos Activos:</strong>
        <span style="color:#666;">${originalAllNodesCount} ➔ <b style="color:${finished ? '#28a745' : '#ffa500'};">${nodes}</b></span>
      </div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #ccc; padding-bottom:5px; margin-bottom:5px;">
        <strong>Créditos Totales:</strong>
        <span style="color:#666;">${totalOriginalCreds} ➔ <b style="color:${finished ? '#28a745' : '#ffa500'};">${creds}</b></span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <strong>Duración (Semestres):</strong>
        <span style="color:#666;">${originalSemesters} ➔ <b style="color:${finished ? '#28a745' : '#ffa500'};">${semesters}</b></span>
      </div>
    `;
  };

  const ejecutarReordenamiento = (isAnimated) => {
    // 1. Ordenamiento Topológico y Asignación de Semestres (CRÍTICO)
    allNodes = dsNodes.get();
    let inDegree = {};
    let outEdges = {};
    let adjList = {};

    let closingNodeIds = allNodes.filter(n => {
      let lbl = n.label.toUpperCase();
      if (lbl.includes('INTRODUCCION') || lbl.includes('INTRODUCCIÓN')) return false;
      return lbl.includes('PRACTICA PROFESIONAL') || lbl.includes('PRÁCTICA PROFESIONAL') ||
        lbl.includes('FORMULACION DE PROYECTO DE TITULACION') || lbl.includes('FORMULACIÓN DE PROYECTO DE TITULACIÓN') ||
        lbl.includes('ACTIVIDAD DE TITULACION') || lbl.includes('ACTIVIDAD DE TITULACIÓN');
    }).map(n => n.id);

    let activeNodes = allNodes; 
    activeNodes.forEach(n => {
      inDegree[n.id] = 0;
      outEdges[n.id] = [];
      adjList[n.id] = [];
    });

    let currentEdges = dsEdges.get();
    currentEdges.forEach(e => {
      if (!e.dashes && adjList[e.from] !== undefined && inDegree[e.to] !== undefined) {
        adjList[e.from].push(e.to);
        outEdges[e.from].push(e.to);
        inDegree[e.to]++;
      }
    });

    let nodeSemester = {};
    let semesterLoads = {}; 
    let readyQueue = [];
    let maxSemesters = 10;
    
    let totalActiveCreds = activeNodes.reduce((acc, n) => acc + (n._creditos || 5), 0);
    let idealSemesters = Math.max(1, originalSemesters - 2); 
    let targetLoad = Math.ceil(totalActiveCreds / idealSemesters);
    let maxLoad = Math.min(40, Math.max(28, targetLoad));

    activeNodes.forEach(n => {
      if (inDegree[n.id] === 0 && !closingNodeIds.includes(n.id)) {
        readyQueue.push(n);
      }
    });

    let unassigned = activeNodes.length - closingNodeIds.length;
    let decisionLog = [];

    while (readyQueue.length > 0 && unassigned > 0) {
      readyQueue.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return (b._creditos || 0) - (a._creditos || 0); 
      });

      let node = readyQueue.shift();
      decisionLog.push({ type: 'start', id: node.id, name: node.label.replace('\n', ' ') });

      let maxPreReqSem = 0;
      currentEdges.forEach(e => {
        if (e.to === node.id && nodeSemester[e.from]) {
          let fromNode = allNodes.find(n => n.id === e.from);
          let ignorar = false;
          if (node._excepciones && fromNode) {
            if (node._excepciones.includes(fromNode.id.toString()) ||
              (fromNode._asicodigo && node._excepciones.includes(fromNode._asicodigo.toUpperCase()))) {
              ignorar = true;
            }
          }
          if (fromNode) {
            let fLbl = fromNode.label.toUpperCase();
            let tLbl = node.label.toUpperCase();
            if (tLbl.includes('INVESTIGACION OPERATIVA') && fLbl.includes('ALGEBRA LINEAL')) ignorar = true;
            if (tLbl.includes('ESTADISTICA COMPUTACIONAL') && fLbl.includes('ESTADISTICA Y PROBABILIDAD')) ignorar = true;
            // (truncated strings for brevity, matches original logic)
          }

          if (!ignorar) {
            let requiredSem = e.dashes ? nodeSemester[e.from] - 1 : nodeSemester[e.from];
            if (requiredSem > maxPreReqSem) {
              maxPreReqSem = requiredSem;
            }
          }
        }
      });

      let minS = maxPreReqSem + 1;
      let propMinS = 1;
      let originalSemestersSinTit = originalSemesters - 1;
      if (originalSemestersSinTit >= 1) {
        let estOptSinTit = idealSemesters;
        propMinS = Math.round((node.level / originalSemestersSinTit) * estOptSinTit);
        propMinS = Math.max(1, propMinS - 1);
        if (node.level <= 2) propMinS = 1;
      }
      
      minS = Math.max(minS, propMinS);
      if (maxPreReqSem > 0) decisionLog.push({ type: 'info', id: node.id, msg: `Prerrequisitos forzan inicio en Semestre ${minS}`});
      else decisionLog.push({ type: 'info', id: node.id, msg: `Sin prerrequisitos, probando desde Semestre ${minS}`});

      let assignedS = minS;
      while (assignedS < maxSemesters) {
        let currentLoad = semesterLoads[assignedS] || 0;
        let nodeCreds = node._creditos || 5;
        
        decisionLog.push({ type: 'try', id: node.id, s: assignedS });
        
        if (currentLoad + nodeCreds <= maxLoad || currentLoad === 0) {
          decisionLog.push({ type: 'success', id: node.id, s: assignedS, msg: `¡Espacio disponible! (${currentLoad + nodeCreds} / ${maxLoad} créditos)`});
          break;
        } else {
          decisionLog.push({ type: 'fail', id: node.id, s: assignedS, msg: `Rechazado: Supera límite de ${maxLoad} créditos (${currentLoad + nodeCreds})`});
        }
        assignedS++;
      }

      if (assignedS > maxSemesters && node._nivel_profundidad !== 4) {
        assignedS = maxSemesters;
      }

      nodeSemester[node.id] = assignedS;
      if (!semesterLoads[assignedS]) semesterLoads[assignedS] = 0;
      semesterLoads[assignedS] += (node._creditos || 5);
      unassigned--;

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

    let N = Object.values(nodeSemester).length > 0 ? Math.max(...Object.values(nodeSemester)) : 10;
    closingNodeIds.forEach(id => {
      let n = allNodes.find(n => n.id === id);
      if (!n) return;
      let lbl = n.label.toUpperCase();
      if (lbl.includes('ACTIVIDAD DE TITULACION') || lbl.includes('ACTIVIDAD DE TITULACIÓN')) {
        nodeSemester[id] = N + 1; 
      } else if (lbl.includes('FORMULACION DE PROYECTO') || lbl.includes('FORMULACIÓN DE PROYECTO')) {
        nodeSemester[id] = N; 
      } else if (lbl.includes('PRACTICA PROFESIONAL II') || lbl.includes('PRÁCTICA PROFESIONAL II')) {
        nodeSemester[id] = N; 
      } else if (lbl.includes('PRACTICA PROFESIONAL I') || lbl.includes('PRÁCTICA PROFESIONAL I')) {
        nodeSemester[id] = Math.max(1, N - 2); 
      }
      decisionLog.push({ type: 'success', id: id, s: nodeSemester[id], msg: `Cierre: Asignado estáticamente al final.`});
    });

    let nodesBySemester = {};
    activeNodes.forEach(node => {
      let assignedS = nodeSemester[node.id];
      if (assignedS === undefined) {
        assignedS = maxSemesters; 
        nodeSemester[node.id] = assignedS;
      }
      if (!nodesBySemester[assignedS]) nodesBySemester[assignedS] = [];
      nodesBySemester[assignedS].push(node);
    });

    let targetPositions = {};
    Object.keys(nodesBySemester).forEach(sem => {
      let nodosEnSemestre = nodesBySemester[sem];
      nodosEnSemestre.sort((a, b) => a.y - b.y);

      nodosEnSemestre.forEach((node, index) => {
        targetPositions[node.id] = {
            x: parseInt(sem) * 450,
            y: index * 120,
            level: parseInt(sem)
        };
      });
    });

    let totalOptimizedCreds = allNodes.reduce((acc, n) => acc + (n._creditos || 0), 0);
    let optimizedSemesters = Object.values(nodeSemester).length > 0 ? Math.max(...Object.values(nodeSemester)) : 0;

    if (isAnimated) {
      let algConsole = document.getElementById('algConsole');
      if (!algConsole) {
        algConsole = document.createElement('div');
        algConsole.id = 'algConsole';
        algConsole.setAttribute('style', "position: absolute; bottom: 20px; left: 20px; z-index: 1002; background: rgba(0,0,0,0.85); color: #0f0; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; width: 450px; height: 150px; overflow-y: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.5); display: flex; flex-direction: column-reverse; line-height: 1.4;");
        document.body.appendChild(algConsole);
      }
      algConsole.innerHTML = "<div>Iniciando heurística Greedy con Balanceo de Carga...</div>";
      
      let stepIndex = 0;
      let currentVisUpdates = [];
      
      function playLog() {
        if (stepIndex >= decisionLog.length) {
          algConsole.innerHTML = "<div><b style='color:#0ff'>[COMPLETADO]</b> Todas las restricciones satisfechas. Iniciando deslizamiento final...</div>" + algConsole.innerHTML;
          
          setTimeout(() => {
              // Sliding logic from before
              let startPositions = {};
              let nodeOrder = [];
              for (let id in targetPositions) {
                  startPositions[id] = network.getPosition(id);
                  nodeOrder.push(id);
              }
              nodeOrder.sort((a, b) => targetPositions[a].x - targetPositions[b].x);
              
              let startTime = performance.now();
              let durationPerNode = 2500; 
              let staggerDelay = 80;
              
              function slideStep(currentTime) {
                  let elapsed = currentTime - startTime;
                  let allDone = true;
                  for (let i = 0; i < nodeOrder.length; i++) {
                      let id = nodeOrder[i];
                      let nodeStart = i * staggerDelay;
                      if (elapsed > nodeStart) {
                          let progress = Math.min((elapsed - nodeStart) / durationPerNode, 1);
                          let easeProgress = 1 - Math.pow(1 - progress, 3);
                          let start = startPositions[id];
                          let target = targetPositions[id];
                          if (start && target) {
                              network.moveNode(id, start.x + (target.x - start.x) * easeProgress, start.y + (target.y - start.y) * easeProgress);
                          }
                          if (progress < 1) allDone = false;
                      } else {
                          allDone = false;
                      }
                  }
                  if (!allDone) {
                      requestAnimationFrame(slideStep);
                  } else {
                      let finalUpdates = [];
                      for (let id in targetPositions) {
                          finalUpdates.push({id: id, x: targetPositions[id].x, y: targetPositions[id].y, level: targetPositions[id].level, color: undefined, font: undefined});
                      }
                      dsNodes.update(finalUpdates);
                      network.setData({ nodes: dsNodes, edges: dsEdges });
                      updateDashboard(allNodes.length, totalOptimizedCreds, optimizedSemesters, true);
                  }
              }
              requestAnimationFrame(slideStep);
          }, 1500);
          return;
        }

        let log = decisionLog[stepIndex];
        let msgHtml = "";
        
        if (log.type === 'start') {
           msgHtml = `<div style="color: #ff0;">> Evaluando Nodo [${log.name}]</div>`;
           network.selectNodes([log.id]);
        } else if (log.type === 'info') {
           msgHtml = `<div style="color: #aaa; margin-left: 10px;">- ${log.msg}</div>`;
        } else if (log.type === 'try') {
           msgHtml = `<div style="color: #fff; margin-left: 10px;">[TEST] Intentando ubicar en Semestre ${log.s}...</div>`;
           // Mover el nodo temporalmente para que parezca que está "probando" ese semestre
           network.moveNode(log.id, log.s * 450, -200); 
           dsNodes.update({id: log.id, color: {background: 'orange', border: 'yellow'}, font: {color:'black'}});
        } else if (log.type === 'fail') {
           msgHtml = `<div style="color: #f55; margin-left: 20px;">✖ ${log.msg}</div>`;
           dsNodes.update({id: log.id, color: {background: 'red', border: 'darkred'}});
        } else if (log.type === 'success') {
           msgHtml = `<div style="color: #5f5; margin-left: 20px;">✔ ${log.msg}</div>`;
           dsNodes.update({id: log.id, color: {background: '#28a745', border: '#1e7e34'}, font: {color:'white'}});
           network.unselectAll();
        }

        algConsole.innerHTML = msgHtml + algConsole.innerHTML;
        
        // Remove older lines to keep it clean (keep max 10 divs)
        while (algConsole.children.length > 15) {
            algConsole.removeChild(algConsole.lastChild);
        }

        let delay = log.type === 'start' ? 200 : (log.type === 'try' ? 150 : (log.type === 'fail' ? 250 : 300));
        stepIndex++;
        setTimeout(playLog, delay);
      }
      
      playLog();

    } else {
      let finalUpdates = [];
      for (let id in targetPositions) {
          finalUpdates.push({
              id: id,
              x: targetPositions[id].x,
              y: targetPositions[id].y,
              level: targetPositions[id].level
          });
      }
      dsNodes.update(finalUpdates);
      network.setData({ nodes: dsNodes, edges: dsEdges });
      updateDashboard(allNodes.length, totalOptimizedCreds, optimizedSemesters, true);
    }
  };

const procesarEliminacionUnica = (idEliminar) => {
    let reqs = dsEdges.get().filter(e => e.to === idEliminar).map(e => e.from);
    let succs = dsEdges.get().filter(e => e.from === idEliminar).map(e => e.to);
    reqs.forEach(r => {
      succs.forEach(s => {
        if (r !== s) dsEdges.add({ id: `${r}-${s}-bypass`, from: r, to: s, arrows: 'to', color: { color: '#aaa', highlight: '#333' } });
      });
    });
    let edgesToRemove = dsEdges.get().filter(e => e.from === idEliminar || e.to === idEliminar).map(e => e.id);
    dsEdges.remove(edgesToRemove);
    dsNodes.remove(idEliminar);
  };

  if (animar) {
    statsPnl.style.display = 'flex';
    let currNodes = originalAllNodesCount;
    let currCreds = totalOriginalCreds;
    updateDashboard(currNodes, currCreds, originalSemesters, false);

    let updates = [];
    nodosAEliminar.forEach(id => { updates.push({ id: id, color: { background: '#ff4444', border: '#cc0000' }, font: { color: 'white' } }); });
    nodosMencion.forEach(id => { updates.push({ id: id, color: { background: '#4444ff', border: '#0000cc' }, font: { color: 'white' } }); });
    if(updates.length > 0) dsNodes.update(updates);

    if (nodosAEliminar.length > 0) {
      let i = 0;
      let interval = setInterval(() => {
        if (i < nodosAEliminar.length) {
          let id = nodosAEliminar[i];
          let nodeInfo = dsNodes.get(id);
          if (nodeInfo) {
              currNodes--;
              currCreds -= (nodeInfo._creditos || 0);
              updateDashboard(currNodes, currCreds, originalSemesters, false);
              procesarEliminacionUnica(id);
          }
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => ejecutarReordenamiento(true), 300);
        }
      }, 150); // 150ms per node
    } else {
      setTimeout(() => ejecutarReordenamiento(true), 1500);
    }
  } else {
    // Sincrono
    if (nodosAEliminar.length > 0) {
      nodosAEliminar.forEach(id => procesarEliminacionUnica(id));
    }
    statsPnl.style.display = 'flex';
    ejecutarReordenamiento(false);
  }
}

document.getElementById('btnGraphOpt').addEventListener('click', function () {
  aplicarOptimizacionGraph(false);
});