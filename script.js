let Graph;
let currentNode = null;

/* modal- und search-elemente */
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


/* modal öffnen */
function openModal(node) {
  currentNode = node;
  
  /* title ist das topic (teaches) */
  modalTitle.textContent = node.teaches || 'Kein Topic';
  
  /* id klein darunter */
  modalId.textContent = node.name;
  
  /* keywords */
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

/* modal schließen */
function closeModal() {
  modal.classList.add('hidden');
  currentNode = null;
}

/* graph-daten parsen: konvertiert api-response in nodes/links format */
function parseGraphData(data) {
  const nodes = [];
  const links = [];
  const seen = new Set();

  /* @graph kann array oder einzelnes objekt sein */
  const graphItems = Array.isArray(data["@graph"]) ? data["@graph"] : [data["@graph"]];

  /* rekursive funktion um verschachtelte objekte zu verarbeiten */
  function processItem(item) {
    const id = item["@id"];
    if (!seen.has(id)) {
      nodes.push({
        id: id,
        name: id,
        repo_link: "https://github.com/STEMgraph/" + id,
        teaches: item["teaches"] || null,
        keywords: item["keywords"] || []
      });
      seen.add(id);
    }
    
    (item["dependsOn"] || []).forEach(target => {
      /* target kann string (id) oder objekt sein */
      const targetId = typeof target === 'string' ? target : target["@id"];
      links.push({ source: id, target: targetId });
      
      if (!seen.has(targetId)) {
        nodes.push({
          id: targetId,
          name: targetId,
          repo_link: "https://github.com/STEMgraph/" + targetId,
          teaches: typeof target === 'object' ? target["teaches"] : null,
          keywords: typeof target === 'object' ? (target["keywords"] || []) : []
        });
        seen.add(targetId);
      }
      
      /* wenn target ein objekt ist, rekursiv verarbeiten */
      if (typeof target === 'object' && target["@id"]) {
        processItem(target);
      }
    });
  }

  graphItems.forEach(item => processItem(item));
  return { nodes, links };
}

/* graph mit neuen daten laden */
function loadGraph(url) {
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const graphData = parseGraphData(data);
      Graph.graphData(graphData);
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
  
  /* api-call zum subgraph laden */
  const apiUrl = `http://localhost:8000/getPathToExercise/${currentNode.id}`;
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (!data["@graph"]) {
        alert("Keine Daten für diesen Node gefunden!");
        closeModal();
        return;
      }
      
      /* neuaufbau des graphs mit subgraph-daten */
      Graph.graphData(parseGraphData(data));
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
    loadGraph(`http://localhost:8000/getExercisesByKeyword/${encodeURIComponent(keyword)}`);
  }
});

/* keyword-graph anzeigen */
btnShowKeywords.addEventListener('click', (e) => {
  e.preventDefault();
  fetch('http://localhost:8000/getKeywords')
    .then(response => response.json())
    .then(data => {
      const keywords = data.keywords || [];
      
      /* erstelle nodes für jedes keyword */
      const nodes = keywords.map(keyword => ({
        id: keyword,
        name: keyword,
        isKeyword: true
      }));
      
      /* keine links zwischen keywords */
      const graphData = { nodes, links: [] };
      
      Graph.graphData(graphData);
    })
    .catch(error => {
      console.error("Fehler beim Laden der Keywords:", error);
      alert("Konnte Keywords nicht laden.");
    });
});

/* initialer load des kompletten graphs von der api */
fetch("http://localhost:8000/getWholeGraph")
  .then(response => response.json())
  .then(data => {
    /* anpassung an graph-format mit nodes und links */
    const graphData = parseGraphData(data);

    Graph = ForceGraph3D()(document.getElementById("graph-container"))
      .graphData(graphData)
      .nodeLabel(node => node.teaches || node.name)
      .nodeAutoColorBy("id")
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.01)
      .onNodeClick(node => {
        /* keyword-nodes triggern suche, normale nodes öffnen modal */
        if (node.isKeyword) {
          loadGraph(`http://localhost:8000/getExercisesByKeyword/${encodeURIComponent(node.name)}`);
        } else {
          openModal(node);
        }
      });
  })
  .catch(error => console.error("Fehler beim Laden:", error));