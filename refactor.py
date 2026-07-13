import re

with open('/home/diego/IO/main.js', 'r') as f:
    content = f.read()

start = content.find("function aplicarOptimizacionGraph(animar) {")
end = content.find("document.getElementById('btnGraphOpt').addEventListener", start)

new_func = """function aplicarOptimizacionGraph(animar) {
  if (!network) return;
  const dsNodes = network.body.data.nodes;
  const dsEdges = network.body.data.edges;
  let allNodes = dsNodes.get();

  const originalAllNodesCount = allNodes.length;
  const totalOriginalCreds = allNodes.reduce((acc, n) => acc + (n._creditos || 0), 0);
  const originalSemesters = Math.max(...allNodes.map(n => n.level));

  const mencion = document.getElementById('selectMencion').value;
  const eximirIngles = document.getElementById('chkEximicionIngles') && document.getElementById('chkEximicionIngles').checked;

  let nodosAEliminar = [];
  let nodosMencion = [];

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

    while (readyQueue.length > 0 && unassigned > 0) {
      readyQueue.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return (b._creditos || 0) - (a._creditos || 0); 
      });

      let node = readyQueue.shift();

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
            if (tLbl.includes('INVESTIGACIÓN OPERATIVA') && fLbl.includes('ÁLGEBRA LINEAL')) ignorar = true;
            if (tLbl.includes('ESTADISTICA COMPUTACIONAL') && fLbl.includes('ESTADISTICA Y PROBABILIDAD')) ignorar = true;
            if (tLbl.includes('ESTADÍSTICA COMPUTACIONAL') && fLbl.includes('ESTADÍSTICA Y PROBABILIDAD')) ignorar = true;
            if (tLbl.includes('SEGURIDAD DE LA INFORMACION') && fLbl.includes('LABORATORIO DE REDES')) ignorar = true;
            if (tLbl.includes('SEGURIDAD DE LA INFORMACIÓN') && fLbl.includes('LABORATORIO DE REDES')) ignorar = true;
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

      let assignedS = minS;
      while (assignedS < maxSemesters) {
        let currentLoad = semesterLoads[assignedS] || 0;
        let nodeCreds = node._creditos || 5;
        if (currentLoad + nodeCreds <= maxLoad || currentLoad === 0) {
          break;
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
      let startPositions = {};
      for (let id in targetPositions) {
          startPositions[id] = network.getPosition(id);
      }
      
      let startTime = performance.now();
      let duration = 1200; // 1.2 segundos deslizando
      
      function step(currentTime) {
          let elapsed = currentTime - startTime;
          let progress = Math.min(elapsed / duration, 1);
          let easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease out
          
          for (let id in targetPositions) {
              let start = startPositions[id];
              let target = targetPositions[id];
              if (start && target) {
                  let currentX = start.x + (target.x - start.x) * easeProgress;
                  let currentY = start.y + (target.y - start.y) * easeProgress;
                  network.moveNode(id, currentX, currentY);
              }
          }
          
          if (progress < 1) {
              requestAnimationFrame(step);
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
      }
      requestAnimationFrame(step);
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
"""

with open('/home/diego/IO/main.js', 'w') as f:
    f.write(content[:start] + new_func + "\n" + content[end:])
