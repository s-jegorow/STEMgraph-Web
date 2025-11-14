let Graph;
let currentNode = null;
localStorage.removeItem('graphHistory'); /* Fix für Reload */
let graphHistory = [];

/* modal- und search-elemente zuordnen */
const modal = document.getElementById('node-modal');
const modalTitle = document.getElementById('modal-title');
const modalId = document.getElementById('modal-id');
const modalKeywords = document.getElementById('modal-keywords');
const btnExplore = document.getElementById('btn-explore');
const btnGithub = document.getElementById('btn-github');
const btnClose = document.getElementById('btn-close');
const searchForm = document.getElementById('search-form');
const keywordInput = document.getElementById('keywordsearch');
const resetLink = document.getElementById('reset-graph');
const btnShowKeywords = document.getElementById('btn-show-keywords');
const btnShowKeywordCloud = document.getElementById('btn-show-keywordcloud');
const btnBack = document.getElementById('btn-back');
const btnZoomReset = document.getElementById('btn-zoom-reset');


/* modal kram*/
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

  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  currentNode = null;
}

/* api-response parsen */
function parseGraphData(data) {
  const nodes = [];
  const links = [];
  const seen = new Set();
  const nodeMap = new Map();
  const graphItems = Array.isArray(data["@graph"]) ? data["@graph"] : [data["@graph"]];

  function processItem(item) {
    const id = item["@id"];
    
    if (!seen.has(id)) {

      const node = {
        id: id,
        name: id,
        repo_link: "https://github.com/STEMgraph/" + id,
        teaches: item["teaches"] || null,
        keywords: item["keywords"] || []
      };

      nodes.push(node);
      nodeMap.set(id, node);
      seen.add(id);

    } else {

      const existingNode = nodeMap.get(id);
      if (item["teaches"]) existingNode.teaches = item["teaches"];
      if (item["keywords"] && item["keywords"].length > 0) existingNode.keywords = item["keywords"];
    }
    
    (item["dependsOn"] || []).forEach(target => {
      const targetId = typeof target === 'string' ? target : target["@id"];
      links.push({ source: id, target: targetId });
      
      if (!seen.has(targetId)) {

        const node = {
          id: targetId,
          name: targetId,
          repo_link: "https://github.com/STEMgraph/" + targetId,
          teaches: typeof target === 'object' ? target["teaches"] : null,
          keywords: typeof target === 'object' ? (target["keywords"] || []) : []
        };

        nodes.push(node);
        nodeMap.set(targetId, node);
        seen.add(targetId);
      }
      
      if (typeof target === 'object' && target["@id"]) {
        processItem(target);
      }
    });
  }

  graphItems.forEach(item => processItem(item));
  return { nodes, links };
}

/* history management */
function pushHistory(apiUrl) {
  graphHistory.push(apiUrl);
  localStorage.setItem('graphHistory', JSON.stringify(graphHistory));
  updateBackButton();
}

/* graph mit den geparsten daten laden*/
function loadGraph(url, addToHistory = true) {

  if (addToHistory) {
    pushHistory(url);
  }

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const graphData = parseGraphData(data);
      Graph.nodeVal(() => 1);
      Graph.graphData(graphData);
      Graph.nodeAutoColorBy("id");
    })
    .catch(error => {
      console.error("Fehler beim Laden:", error);
      alert("Konnte Daten nicht laden.");
    });
}

/* event-listener für modal-buttons */
btnClose.addEventListener('click', closeModal);
btnExplore.addEventListener('click', () => {
  if (!currentNode) return;
  
  /* api-call zum subgraph + neuaufbau*/
  const apiUrl = `http://localhost:8000/getPathToExercise/${currentNode.id}`;
  
  pushHistory(apiUrl);

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (!data["@graph"]) {
        alert("Keine Daten für diesen Node gefunden!");
        closeModal();
        return;
      }
      const graphData = parseGraphData(data);

      Graph.nodeVal(() => 1);
      Graph.nodeAutoColorBy('id');
      Graph.graphData(graphData);

      closeModal();
    })
    .catch(error => {
      console.error("Fehler beim Laden des Subgraphen:", error);
      alert("Konnte Subgraph nicht laden.");
    });
});

btnGithub.addEventListener('click', () => {
  if (currentNode && currentNode.repo_link && currentNode.repo_link !== "unknown") {
    window.open(currentNode.repo_link, "_blank");
    closeModal();
  }
});

/* keyword-suche */
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const keyword = keywordInput.value.trim();
  if (keyword) {
    const url = `http://localhost:8000/getExercisesByKeyword/${encodeURIComponent(keyword)}`;
    pushHistory(url);
    loadGraph(url, false);
  }
});

/* keyword-graph anzeigen */
btnShowKeywords.addEventListener('click', (e) => {
  e.preventDefault();
  const url = 'http://localhost:8000/getKeywordList';
  pushHistory(url);

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const keywords = data.keywords || [];
      
      const nodes = keywords.map(keyword => ({
        id: keyword,
        name: keyword,
        isKeyword: true
      }));
      
      const graphData = { nodes, links: [] };
      
      Graph.nodeVal(() => 1);
      Graph.graphData(graphData);
      Graph.nodeAutoColorBy("id");
    })
    .catch(error => {
      console.error("Fehler beim Laden der Keywords:", error);
      alert("Konnte Keywords nicht laden.");
    });
});

/* keyword cloud anzeigen */
btnShowKeywordCloud.addEventListener('click', (e) => {
  e.preventDefault();
  const url = 'http://localhost:8000/getKeywordCount';
  pushHistory(url);

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const keywordCounts = data.keywords || {};
      
      const nodes = Object.entries(keywordCounts).map(([keyword, count]) => ({
        id: keyword,
        name: keyword,
        val: Math.pow(count, 3),
        isKeyword: true
      }));
      
      const graphData = { nodes, links: [] };
      
      Graph.nodeVal(node => node.val || 1);
      Graph.graphData(graphData);
      Graph.nodeAutoColorBy("id");
    })
    .catch(error => {
      console.error("Fehler beim Laden der Keyword Cloud:", error);
      alert("Konnte Keyword Cloud nicht laden.");
    });
});

/* zoom reset button */
btnZoomReset.addEventListener('click', (e) => {
  e.preventDefault();
  if (Graph) {
    Graph.zoomToFit(400);
  }
});

/* schritt zurück */
function goBack() {
  if (graphHistory.length <= 1) return;
  
  graphHistory.pop();
  const previousUrl = graphHistory[graphHistory.length - 1];
  
  if (previousUrl) {
    loadGraph(previousUrl, false);
  }
  
  localStorage.setItem('graphHistory', JSON.stringify(graphHistory));
  updateBackButton();
}

function updateBackButton() {
  if (graphHistory.length <= 1) {
    btnBack.classList.add('disabled');
  } else {
    btnBack.classList.remove('disabled');
  }
}

btnBack.addEventListener('click', (e) => {
  e.preventDefault();
  goBack();
});

/* initialer load des kompletten graphs von der api */
const firstUrl = "http://localhost:8000/getWholeGraph";
pushHistory(firstUrl);

fetch(firstUrl)
  .then(response => response.json())
  .then(data => {
    const graphData = parseGraphData(data);

    Graph = ForceGraph3D()(document.getElementById("graph-container"))
      .graphData(graphData)
      .nodeLabel(node => node.teaches || node.name)
      .nodeAutoColorBy("id")
      .nodeVal(() => 1)
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.01)
      .onNodeClick(node => {

        /* keyword-nodes triggern suche, normale nodes öffnen modal */
        if (node.isKeyword) {
          const url = `http://localhost:8000/getExercisesByKeyword/${encodeURIComponent(node.name)}`;
          pushHistory(url);
          loadGraph(url, false);
        } else {
          openModal(node);
        }
      });

    updateBackButton();
  })
  .catch(error => console.error("Fehler:s", error));


document.addEventListener('keydown', (e) => {

  if (!modal.classList.contains('hidden') && e.key === 'Escape') {
    closeModal();
  }

  if (modal.classList.contains('hidden') && e.key === ' ') {
    e.preventDefault();
    btnZoomReset.click();
  }

  if (modal.classList.contains('hidden') && e.key === 'ArrowLeft') {
    e.preventDefault();
    btnBack.click();
  }

});