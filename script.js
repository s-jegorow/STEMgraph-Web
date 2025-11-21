let Graph;
let graphHistory = [];
let markedNodes = JSON.parse(localStorage.getItem('markedNodes') || '[]');
let todoNodes = JSON.parse(localStorage.getItem('todoNodes') || '[]');
let currentNode = null;
const API_BASE = 'http://localhost:8000';

/* node-farbe helper */
function getNodeColor(node) {
  if (markedNodes.includes(node.id)) return "#75b3daff"; 
  if (todoNodes.includes(node.id)) return "#fdc075ff";   
  return "#e2e1e1ff";
}

function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

/* dom-zuweisung für event handler */
const modal = document.getElementById('node-modal');
const statisticsModal = document.getElementById('statistics-modal');
const helpModal = document.getElementById('help-modal');
const modalTitle = document.getElementById('modal-title');
const modalId = document.getElementById('modal-id');
const modalKeywords = document.getElementById('modal-keywords');
const btnExplore = document.getElementById('btn-explore');
const btnGithub = document.getElementById('btn-github');
const btnMarkNode = document.getElementById('btn-marknode');
const btnTodoNode = document.getElementById('btn-todonode');
const btnBack = document.getElementById('btn-back');
const searchForm = document.getElementById('search-form');
const keywordInput = document.getElementById('keywordsearch');
const resetLink = document.getElementById('reset-graph');
const btnShowKeywords = document.getElementById('btn-show-keywords');
const btnShowKeywordCloud = document.getElementById('btn-show-keywordcloud');
const btnShowTodo = document.getElementById('btn-show-todo');
const btnShowStatistics = document.getElementById('btn-show-statistics');
const btnShowHelp = document.getElementById('btn-show-help');
const btnZoomReset = document.getElementById('btn-zoom-reset');

/* history funktionen */
function initHistory() {
  graphHistory = [];
  localStorage.removeItem('graphHistory');
  updateBackButton();
}

function updateBackButton() {
  if (graphHistory.length <= 1) {
    btnBack.classList.add('disabled');
  } else {
    btnBack.classList.remove('disabled');
  }
}

function pushHistory(apiUrl) {
  graphHistory.push(apiUrl);
  localStorage.setItem('graphHistory', JSON.stringify(graphHistory));
  updateBackButton();
}

function goBack() {
  if (graphHistory.length <= 1) return;
  graphHistory.pop();
  const previousUrl = graphHistory[graphHistory.length - 1];
  if (previousUrl) loadGraph(previousUrl, false);
  localStorage.setItem('graphHistory', JSON.stringify(graphHistory));
  updateBackButton();
}

/* node-modal */
function openModal(node) {
  currentNode = node;
  modalTitle.textContent = node.teaches || 'Kein Topic';
  modalId.textContent = node.name;

  modalKeywords.innerHTML = '';
  if (node.keywords && node.keywords.length > 0) {
    node.keywords.forEach(keyword => {
      const span = document.createElement('span');
      span.textContent = keyword;
      modalKeywords.appendChild(span);
    });
  } else {
    modalKeywords.textContent = 'Keine Keywords';
  }

  if (markedNodes.includes(node.id)) {
    btnMarkNode.textContent = "Mark lesson as not completed";
  } else {
    btnMarkNode.textContent = "Mark lesson as completed";
  }

  if (todoNodes.includes(node.id)) {
    btnTodoNode.textContent = "Remove lesson from to-do list";
  } else {
    btnTodoNode.textContent = "Put lesson on your To-Do list";
  }

  modal.classList.remove('hidden');
}

function openStatisticsModal() {
  document.getElementById('stat-marked-count').textContent = markedNodes.length;
  document.getElementById('stat-todo-count').textContent = todoNodes.length;
  
  fetch(`${API_BASE}/getStatistics`)
    .then(r => r.json())
    .then(data => {
      document.getElementById('stat-node-count').textContent = data.nodeCount || 0;
      document.getElementById('stat-keyword-count').textContent = data.keywordCountDistinct || 0;
    });
  
  statisticsModal.classList.remove('hidden');
}

function openHelpModal() {
  helpModal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  statisticsModal.classList.add('hidden');
  helpModal.classList.add('hidden');
  currentNode = null;
}

/* event listener modal-buttons */
document.querySelectorAll('.btn-close').forEach(btn => {
  btn.addEventListener('click', closeModal);
});

btnBack.addEventListener('click', e => {
  e.preventDefault();
  goBack();
});

btnShowStatistics.addEventListener('click', e => {
  e.preventDefault();
  openStatisticsModal();
});

btnShowHelp.addEventListener('click', e => {
  e.preventDefault();
  openHelpModal();
});

/* node markieren  */
btnMarkNode.addEventListener('click', () => {
  if (!currentNode) return;

  if (markedNodes.includes(currentNode.id)) {
    markedNodes = markedNodes.filter(id => id !== currentNode.id);
    btnMarkNode.textContent = "Mark lesson as completed";
  } else {
    markedNodes.push(currentNode.id);
    btnMarkNode.textContent = "Mark lesson as not completed";
  }

  localStorage.setItem('markedNodes', JSON.stringify(markedNodes));
  Graph.nodeColor(Graph.nodeColor());
});

/* node todo */
btnTodoNode.addEventListener('click', () => {
  if (!currentNode) return;

  if (todoNodes.includes(currentNode.id)) {
    todoNodes = todoNodes.filter(id => id !== currentNode.id);
    btnTodoNode.textContent = "Put lesson on your To-Do list";
  } else {
    todoNodes.push(currentNode.id);
    btnTodoNode.textContent = "Remove lesson from to-do list";
  }

  localStorage.setItem('todoNodes', JSON.stringify(todoNodes));
  Graph.nodeColor(Graph.nodeColor());
});

/* subgraph */
btnExplore.addEventListener('click', () => {
  if (!currentNode) return;

  Graph.nodeAutoColorBy(null);
  const apiUrl = `${API_BASE}/getPathToExercise/${currentNode.id}`;
  loadGraph(apiUrl, true);
  closeModal();
});

/* link zur lesson */
btnGithub.addEventListener('click', () => {
  if (currentNode && currentNode.repo_link && currentNode.repo_link !== "unknown") {
    window.open(currentNode.repo_link, "_blank");
    closeModal();
  }
});

/* keyword-suche */
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const keyword = keywordInput.value.trim();
  if (keyword) {
    Graph.nodeAutoColorBy(null);
    loadGraph(`${API_BASE}/getExercisesByKeyword/${encodeURIComponent(keyword)}`);
  }
});

/* keyword liste anzeigen */
btnShowKeywords.addEventListener('click', e => {
  e.preventDefault();
  if (!Graph) return;

  const apiUrl = `${API_BASE}/getKeywordList`;

  fetch(apiUrl)
    .then(r => r.json())
    .then(data => {
      const keywords = data.keywords || [];
      
      const nodes = keywords.map(keyword => ({
        id: keyword,
        name: keyword,
        color: getRandomColor(),
        isKeyword: true
      }));

      const graphData = { nodes, links: [] };

      Graph.nodeAutoColorBy(null);
      Graph.nodeColor(node => node.color || getNodeColor(node));
      Graph.nodeVal(() => 1);
      Graph.graphData(graphData);

      setTimeout(() => Graph.zoomToFit(400, 80), 100);
      pushHistory(apiUrl);
    });
});

/* keyword cloud */
btnShowKeywordCloud.addEventListener('click', (e) => {
  e.preventDefault();
  if (!Graph) return;

  const apiUrl = `${API_BASE}/getKeywordCount`;

  fetch(apiUrl)
    .then(r => r.json())
    .then(data => {
      const keywordCounts = data.keywords || {};

      const nodes = Object.entries(keywordCounts).map(([keyword, count]) => ({
        id: keyword,
        name: keyword,
        val: Math.pow(count, 3),
        color: getRandomColor(),
        isKeyword: true
      }));

      const graphData = { nodes, links: [] };

      Graph.nodeAutoColorBy(null);
      Graph.nodeColor(node => node.color || getNodeColor(node));
      Graph.nodeVal(node => node.val || 1);
      Graph.graphData(graphData);

      setTimeout(() => Graph.zoomToFit(400, 80), 100);
      pushHistory(apiUrl);
    });
});

/* to-do graph mit dependencies */
btnShowTodo.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!Graph || todoNodes.length === 0) {
    alert('Keine To-Do Lessons vorhanden!');
    return;
  }

  try {
    // versuche dependencies zu laden
    const pathPromises = todoNodes.map(nodeId =>
      fetch(`${API_BASE}/getPathToExercise/${nodeId}`)
        .then(r => r.json())
    );

    const pathResults = await Promise.all(pathPromises);

    // alle nodes und links zusammenführen
    const allNodes = new Map();
    const allLinks = [];

    pathResults.forEach(data => {
      const graphData = parseGraphData(data);
      
      graphData.nodes.forEach(node => {
        if (!allNodes.has(node.id)) {
          allNodes.set(node.id, node);
        }
      });

      graphData.links.forEach(link => {
        const linkId = `${link.source}-${link.target}`;
        if (!allLinks.find(l => `${l.source}-${l.target}` === linkId)) {
          allLinks.push(link);
        }
      });
    });

    const combinedGraph = {
      nodes: Array.from(allNodes.values()),
      links: allLinks
    };

    Graph.nodeAutoColorBy(null);
    Graph.nodeColor(getNodeColor);
    Graph.nodeVal(() => 1);
    Graph.graphData(combinedGraph);

    setTimeout(() => Graph.zoomToFit(400, 80), 100);
  } catch (error) {
    console.error('Fehler beim Laden des To-Do Graphs:', error);
    alert('Fehler beim Laden des To-Do Graphs');
  }
});

/* zoom reset */
btnZoomReset.addEventListener('click', e => {
  e.preventDefault();
  if (!Graph) return;
  Graph.zoomToFit(400, 80);
});

/* initialer load */
const initialUrl = `${API_BASE}/getWholeGraph`;

initHistory();

fetch(initialUrl)
  .then(r => r.json())
  .then(data => {
    const graphData = parseGraphData(data);

    Graph = ForceGraph3D()(document.getElementById("graph-container"))
      .graphData(graphData)
      .nodeLabel(node => node.teaches || node.name)
      .nodeColor(getNodeColor)
      .nodeVal(() => 1)
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.01)
      .onNodeClick(node => {
        if (node.isKeyword) {
          Graph.nodeAutoColorBy(null);
          loadGraph(`${API_BASE}/getExercisesByKeyword/${encodeURIComponent(node.name)}`);
        } else {
          openModal(node);
        }
      });

    pushHistory(initialUrl);
    setTimeout(() => Graph.zoomToFit(400, 80), 200);
  });

/* keyword autocomplete */
fetch(`${API_BASE}/getKeywordList`)
  .then(r => r.json())
  .then(data => {
    const datalist = document.getElementById('keyword-suggestions');
    (data.keywords || []).forEach(keyword => {
      const option = document.createElement('option');
      option.value = keyword;
      datalist.appendChild(option);
    });
  });

/* keyboard bindings */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!modal.classList.contains('hidden') || 
        !statisticsModal.classList.contains('hidden') || 
        !helpModal.classList.contains('hidden')) {
      closeModal();
    }
  }

  if (e.key === ' ' || e.code === 'Space') {
    if (document.activeElement.tagName !== 'INPUT' && Graph) {
      e.preventDefault();
      Graph.zoomToFit(400, 80);
    }
  }

 if (e.key === 'ArrowLeft' || (e.key === 'z' && e.ctrlKey)) {
  if (document.activeElement.tagName !== 'INPUT' && graphHistory.length > 1) {
    e.preventDefault();
    goBack();
  }
  }

  if (e.key === 'F1') {
    e.preventDefault();
    openHelpModal();
  }
});

/* query params */
(function() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('keyword')) {
    const kw = params.get('keyword').trim();
    if (kw) loadGraph(`${API_BASE}/getExercisesByKeyword/${encodeURIComponent(kw)}`);
    return;
  }

  if (params.has('node')) {
    const id = params.get('node').trim();
    if (id) loadGraph(`${API_BASE}/getPathToExercise/${encodeURIComponent(id)}`);
    return;
  }
})();