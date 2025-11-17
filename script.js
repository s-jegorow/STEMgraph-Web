let Graph;
let graphHistory = [];
let currentNode = null;

/* modal- und search-elemente zuordnen */
const modal = document.getElementById('node-modal');
const modalTitle = document.getElementById('modal-title');
const modalId = document.getElementById('modal-id');
const modalKeywords = document.getElementById('modal-keywords');
const btnExplore = document.getElementById('btn-explore');
const btnGithub = document.getElementById('btn-github');
const btnClose = document.getElementById('btn-close');
const btnBack = document.getElementById('btn-back');
const searchForm = document.getElementById('search-form');
const keywordInput = document.getElementById('keywordsearch');
const resetLink = document.getElementById('reset-graph');
const btnShowKeywords = document.getElementById('btn-show-keywords');
const btnShowKeywordCloud = document.getElementById('btn-show-keywordcloud');
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


/* event-listener für modal-buttons */
btnClose.addEventListener('click', closeModal);

btnBack.addEventListener('click', (e) => {
  e.preventDefault();
  goBack();
});

btnExplore.addEventListener('click', () => {
  if (!currentNode) return;
  
  /* api-call zum subgraph + neuaufbau*/
  const apiUrl = `http://localhost:8000/getPathToExercise/${currentNode.id}`;
  
  loadGraph(apiUrl, true);
  closeModal();
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
  
  if (!Graph) {
    alert('Graph wird noch geladen, bitte warten...');
    return;
  }
  
  const apiUrl = 'http://localhost:8000/getKeywordList';
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const keywords = data.keywords || [];
      
      /* nodes für jedes keyword */
      const nodes = keywords.map(keyword => ({
        id: keyword,
        name: keyword,
        isKeyword: true
      }));
      
      /* keine links bei keywords! */
      const graphData = { nodes, links: [] };
      
      /* nodeval einführen für die nodegrößen */
      Graph.nodeVal(() => 1);
      Graph.graphData(graphData);
      
      setTimeout(() => {
        Graph.zoomToFit(400, 80);
      }, 100);
      
      pushHistory(apiUrl);
    })
    .catch(error => {
      console.error("Fehler beim Laden der Keywords:", error);
      alert("Konnte Keywords nicht laden.");
    });
});


/* keyword cloud anzeigen */
btnShowKeywordCloud.addEventListener('click', (e) => {
  e.preventDefault();
  
  if (!Graph) {
    alert('Graph wird noch geladen, bitte warten...');
    return;
  }
  
  const apiUrl = 'http://localhost:8000/getKeywordCount';
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const keywordCounts = data.keywords || {};
      
      /* erstelle nodes mit val für größe basierend auf count */
      const nodes = Object.entries(keywordCounts).map(([keyword, count]) => ({
        id: keyword,
        name: keyword,
        val: Math.pow(count, 3),  // gerade auf kubik gesetzt
        isKeyword: true
      }));
      
      /* auch hier keine links */
      const graphData = { nodes, links: [] };
      
      /* setze nodeVal BEVOR graphData geladen wird - DONT TOUCH THIS */
      Graph.nodeVal(node => node.val || 1);
      Graph.graphData(graphData);
      
      setTimeout(() => {
        Graph.zoomToFit(400, 80);
      }, 100);
      
      pushHistory(apiUrl);
    })
    .catch(error => {
      console.error("Fehler beim Laden der Keyword Cloud:", error);
      alert("Konnte Keyword Cloud nicht laden.");
    });
});


/* zoom reset */
btnZoomReset.addEventListener('click', (e) => {
  e.preventDefault();
  
  if (!Graph) {
    return;
  }
  
  Graph.zoomToFit(400, 80);
});


/* initialer load des kompletten graphs von der api */
const initialUrl = "http://localhost:8000/getWholeGraph";

initHistory();

fetch(initialUrl)
  .then(response => response.json())
  .then(data => {
    /* anpassung an graph-format mit nodes und links */
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
          loadGraph(`http://localhost:8000/getExercisesByKeyword/${encodeURIComponent(node.name)}`);
        } else {
          openModal(node);
        }
      });
    
    /* initialen graph zur history hinzufügen */
    pushHistory(initialUrl);
    
    setTimeout(() => {
      Graph.zoomToFit(400, 80);
    }, 200);
  })
  .catch(error => console.error("Fehler beim Laden:", error));


/* keyword autocomplete vorbereiten */
fetch('http://localhost:8000/getKeywordList')
  .then(response => response.json())
  .then(data => {
    const datalist = document.getElementById('keyword-suggestions');
    (data.keywords || []).forEach(keyword => {
      const option = document.createElement('option');
      option.value = keyword;
      datalist.appendChild(option);
    });
  })
  .catch(error => console.error("Fehler beim Laden der Keyword-Vorschläge:", error));


/* keyboard bindings */
document.addEventListener('keydown', (e) => {
  // ESC - Modal schließen
  if (e.key === 'Escape') {
    if (!modal.classList.contains('hidden')) {
      closeModal();
    }
  }
  
  // SPACE - Zoom reset
  if (e.key === ' ' || e.code === 'Space') {
    if (document.activeElement.tagName !== 'INPUT' && Graph) {
      e.preventDefault();
      Graph.zoomToFit(400, 80);
    }
  }
  
  // LEFTARROW - Zurück
  if (e.key === 'ArrowLeft') {
    if (document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      if (graphHistory.length > 1) {
        goBack();
      }
    }
  }
});

/* query-parameter handling */
(function() {
  const params = new URLSearchParams(window.location.search);

  // KEYWORD → wie Keyword-Suche
  if (params.has('keyword')) {
    const kw = params.get('keyword').trim();
    if (kw) {
      loadGraph(`http://localhost:8000/getExercisesByKeyword/${encodeURIComponent(kw)}`);
    }
    return; // verhindert initialLoad
  }

  // NODE → wie Node-Klick (Subgraph laden)
  if (params.has('node')) {
    const id = params.get('node').trim();
    if (id) {
      loadGraph(`http://localhost:8000/getPathToExercise/${encodeURIComponent(id)}`);
    }
    return;
  }
})();