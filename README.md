# STEMgraph Web Visualizer

3D visualization of the STEMgraph learning graph.

## Features

- **3D Force Graph** - Interactive 3D visualization of all learning resources
- **ToDo Graph - A Subgraph including all your marked To-Do Nodes
- **Keyword Search** - Find exercises by keywords
- **Keyword Graph** - Visualize all available keywords as a graph
- **Node Details** - Click on nodes for details (topic, keywords, dependencies)
- **Subgraph Exploration** - Load relevant subgraphs for individual exercises
- **Statistics - including all nodes/keywords and individually marked nodes

## Technology

- **Frontend**: Vanilla JS
- **Visualization**: [3d-force-graph](https://github.com/vasturiano/3d-force-graph)
- **API**: FastAPI (STEMgraph-API)

## Usage 
Have fun discovering the STEMgraph, a Cloud of all Keywords or search for a certain Keyword.
- Query Parameter to directly access nodes with their dependencies: index.html?node=uuid
- Query Parameter to directly access nodes with a certain keyword: index.html?keyword=keyword

## Keyboard-Bindings
- LEFTARROW to go one step back
- SPACE to reset the view automatically
- ESC to exit the node-details
- F1 to open the help modal

## To-Do
- Identity features
- more individual possibilities
