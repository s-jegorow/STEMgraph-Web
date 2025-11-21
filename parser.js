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
        id,
        name: id,
        repo_link: "https://github.com/STEMgraph/" + id,
        teaches: item["teaches"] || null,
        keywords: item["keywords"] || []
      };
      nodes.push(node);
      nodeMap.set(id, node);
      seen.add(id);
    } else {
      const existing = nodeMap.get(id);
      if (item["teaches"]) existing.teaches = item["teaches"];
      if (item["keywords"]?.length) existing.keywords = item["keywords"];
    }

    (item["dependsOn"] || []).forEach(target => {
      const targetId = typeof target === "string" ? target : target["@id"];
      links.push({ source: id, target: targetId });

      if (!seen.has(targetId)) {
        const node = {
          id: targetId,
          name: targetId,
          repo_link: "https://github.com/STEMgraph/" + targetId,
          teaches: typeof target === "object" ? target["teaches"] : null,
          keywords: typeof target === "object" ? (target["keywords"] || []) : []
        };
        nodes.push(node);
        nodeMap.set(targetId, node);
        seen.add(targetId);
      }

      if (typeof target === "object" && target["@id"]) processItem(target);
    });
  }

  graphItems.forEach(processItem);
  return { nodes, links };
}

function loadGraph(url, addToHistory = true) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          alert("Keine Ergebnisse gefunden. Bitte überprüfe deine Suchanfrage.");
        } else {
          alert("Fehler beim Laden der Daten von der API.");
        }
        return null;
      }
      return response.json();
    })
    .then(data => {
      if (!data) return;
      
      const graphData = parseGraphData(data);
      // FARBMUSTER FÜR ALLE NORMALEN GRAPHS
      Graph.nodeAutoColorBy(null);
      Graph.nodeColor(getNodeColor);

      Graph.nodeVal(() => 1);
      Graph.graphData(graphData);
      
      setTimeout(() => {
        Graph.zoomToFit(400, 80);
      }, 100);

      if (addToHistory) pushHistory(url);
    })
    .catch(error => {
      console.error("Fehler beim Laden:", error);
    });
}