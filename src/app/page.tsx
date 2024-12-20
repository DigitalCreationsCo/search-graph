/* eslint-disable @next/next/no-img-element */
"use client"
import { Search } from "lucide-react";
import dynamic from 'next/dynamic';
import { GraphConfiguration, GraphLink, GraphNode, GraphProps } from "react-d3-graph";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ErrorBoundary from '@/components/ErrorBoundary'
import { GraphData, Node } from '@/types'
import { addNodeWithDepth, findExistingNode, ensureUniqueNodeId } from "@/utils/nodeUtils";
import React from "react";

// Dynamically import Graph component
const Graph = dynamic(() => import('react-d3-graph').then(mod => mod.Graph as unknown as React.ComponentType<GraphProps<GraphNode, GraphLink>>), {
  ssr: false,
});

function ErrorFallback({ error }) {
  return <div>Error: {error.message}</div>;
}

const GraphComponent = React.memo<GraphProps<GraphNode, GraphLink>>(function GraphComponent ({
  id,
  data, 
  onClickNode, 
  onMouseOverNode, 
  onMouseOutNode, 
  onZoomChange, 
  config 
}) {
  return (
    <Graph
      id={id}
      data={data}
      onClickNode={onClickNode}
      onMouseOverNode={onMouseOverNode}
      onMouseOutNode={onMouseOutNode}
      onZoomChange={onZoomChange}
      config={config}
    />
  )
});

const NodeComponent = React.memo(function NodeComponent({ node }: { node: Node }) {
  return (
    node.visible ? (
        <img
          src={node.image}
          alt={node.title}
          className='h-full w-full object-cover rounded-full'
        />
    ) : <></>
  )
});


export default function Home() {
  const [query, setQuery] = useState('');
  const [graphData, setGraphData] = useState<GraphData>({ 
    nodes: [], 
    links: [], 
    isLoading: true 
  });

  const [zoom, setZoom] = useState(1)
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const graphContainer = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 
  // Memoize graph data to prevent unnecessary updates
  const memoizedGraphData = useMemo<GraphData>(() => ({
    nodes: graphData.nodes,
    links: graphData.links,
    isLoading: graphData.isLoading
  }), [graphData.nodes, graphData.links, graphData.isLoading]);

  const config: Partial<GraphConfiguration<GraphNode & Node, GraphLink>>  = useMemo(() => ({
    "automaticRearrangeAfterDropNode": false,
    "collapsible": false,
    "directed": false,
    "focusAnimationDuration": 0.75,
    "focusZoom": 1,
    "freezeAllDragEvents": false,
    "height": graphContainer.current?.clientHeight || 600,
    "width": graphContainer.current?.clientWidth || 1000,
    "highlightDegree": 1,
    "highlightOpacity": 1,
    "linkHighlightBehavior": false,
    "maxZoom": 8,
    "minZoom": 0.1,
    "nodeHighlightBehavior": false,
    "panAndZoom": true,
    "staticGraph": false,
    "staticGraphWithDragAndDrop": false,
    "d3": {
      "alphaTarget": 0.05,
      "gravity": -100,
      "linkLength": 100,
      "linkStrength": 1,
      "disableLinkForce": false
    },
    "node": {
      "color": "#d3d3d3",
      "fontColor": "#fff",
      "fontSize": 10,
      "fontWeight": "normal",
      "highlightColor": "SAME",
      "highlightFontSize": 8,
      "highlightFontWeight": "normal",
      "highlightStrokeColor": "SAME",
      "highlightStrokeWidth": "SAME",
      "labelProperty": "title",
      "labelPosition": 'bottom',
      "mouseCursor": "pointer",
      "opacity": 1,
      "renderLabel": true,
      "size": 500,
      "strokeColor": "none",
      "strokeWidth": 1.5,
      "svg": "",
      "symbolType": "circle",
      viewGenerator: (node) => <NodeComponent node={node} />,
    },
    "link": {
  //     semanticStrokeWidth: true
      "color": "#d3d3d3",
      "fontColor": "black",
      "fontSize": 8,
      "fontWeight": "normal",
      "highlightColor": "SAME",
      "highlightFontSize": 8,
      "highlightFontWeight": "normal",
      "labelProperty": "source",
      "mouseCursor": "pointer",
      "opacity": 1,
      "renderLabel": false,
      "semanticStrokeWidth": false,
      "strokeWidth": 1.5,
      "markerHeight": 6,
      "markerWidth": 6,
      "strokeDasharray": 0,
      "strokeDashoffset": 0,
      "strokeLinecap": "butt"
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[zoom])

  const handleNodeClick = useCallback(async (nodeId: string) => {
    const selectedNode = graphData.nodes.find((node) => node.id === nodeId);
    if (!selectedNode) return;

    try {
      const newSearchQuery = selectedNode.keywords.join(" ");
      
      // set query in the input bar
      setQuery(newSearchQuery)

      const response = await axios<{ nodes: Node[] }>("/api/search", {
        params: { query: newSearchQuery },
        headers: { "Content-Type": "application/json" },
      });

      const newNodes: Node[] = [];
      const newLinks: GraphLink[] = [];
      
      // Process each node from the response
      response.data.nodes.forEach((responseNode) => {
        console.info('response node ', responseNode)
        // Check if a similar node already exists in the graph
        const existingNode = findExistingNode(responseNode, graphData.nodes);
        
        if (existingNode) {
          // If node exists, just create a new link to it from the selected node
          newLinks.push({
            source: selectedNode.id,
            target: existingNode.id
          });
        } else {
          // If it's a new node, add it
          const newNode = {
            ...responseNode,
            visible: true,
            depth: selectedNode.depth + 1,
            id: ensureUniqueNodeId(responseNode.id, selectedNode.depth + 1)
          };
          
          newNodes.push(newNode);
          newLinks.push({
            source: selectedNode.id,
            target: newNode.id
          });
        }
      });

      // Combine existing and new data
      const allNodes = [...graphData.nodes, ...newNodes];
      const allLinks = [...graphData.links, ...newLinks];

      // Now use addNodeWithDepth to process everything
      const [processedNodes, processedLinks] = addNodeWithDepth(
        allNodes,
        allLinks,
        selectedNode.id,
        selectedNode.depth + 1
      );

      setGraphData({
        nodes: processedNodes,
        links: processedLinks,
        focusedNodeId: nodeId,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch related nodes:", error);
    }
  }, [graphData.nodes, graphData.links]);


  const mouseOverNode = useCallback((nodeId: string) => {
    if (hoverTimeoutRef?.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      const newHoveredNode = graphData.nodes.find(node => node.id === nodeId);
      if (newHoveredNode && hoveredNode?.id !== newHoveredNode?.id) {
        setHoveredNode(newHoveredNode);
        setIsModalOpen(true);
      }
    }, 500);
  }, [graphData.nodes, hoveredNode?.id]);

  const mouseLeaveNode = useCallback(() => {
    if (hoverTimeoutRef?.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  const handleSearch = useCallback(async (e: React.FormEvent | null) => {
    e?.preventDefault();
    if (!query) return;

    try {
      setIsLoading(true);
      const response = await axios<{ nodes: Node[] }>("/api/search", {
        params: { query },
        headers: { "Content-Type": "application/json" },
      });

      const newNodes: Node[] = [];
      const newLinks: GraphLink[] = [];
      let targetId: string = "";
      let targetDepth: number = 0;

      console.info('nodes ', response.data.nodes)
      // Process each node from the response
      response.data.nodes.forEach((responseNode) => {
        console.info('response node ', responseNode)
        // Check if a similar node already exists in the graph
        const existingNode = findExistingNode(responseNode, graphData.nodes);

        if (existingNode && hoveredNode) {
          // If response node and hovernode exist, just create a new link to existing from the hovered node
          targetId= existingNode.id
          targetDepth=existingNode.depth
          newLinks.push({
            source: hoveredNode.id,
            target: targetId
          });
        } else if (hoveredNode) {
          // If only hovered node exists, add the response node
          targetId= ensureUniqueNodeId(responseNode.id, hoveredNode.depth)
          targetDepth=hoveredNode.depth
          const newNode = {
            ...responseNode,
            visible: true,
            depth: targetDepth,
            id: targetId
          };
          
          newNodes.push(newNode);
          newLinks.push({
            source: hoveredNode.id,
            target: newNode.id
          });
        } else {
          // If it's a new node, add it
          targetId= ensureUniqueNodeId(responseNode.id, 0)
          targetDepth=0
          const newNode = {
            ...responseNode,
            visible: true,
            depth: targetDepth,
            id: targetId
          };
          
          newNodes.push(newNode);
          newLinks.push({
            source: response.data.nodes[0].id,
            target: newNode.id
          });
        }
      });

      // Combine existing and new data
      const allNodes = [...graphData.nodes, ...newNodes];
      const allLinks = [...graphData.links, ...newLinks];

      // Now use addNodeWithDepth to process everything
      const [processedNodes, processedLinks] = addNodeWithDepth(
        allNodes,
        allLinks,
        targetId,
        targetDepth
      );

      setGraphData({
        nodes: processedNodes,
        links: processedLinks,
        focusedNodeId: targetId,
        isLoading: false,
      });
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setHoveredNode(null);
  };

  const HighlightQueryTerm = ({ word }: { word: string }) => {
    return <span className='cursor-pointer inline-block hover:bg-yellow-300 hover:text-black' onClick={() => {
      setQuery((prevState) => prevState.split(" ")[0].concat(" ", word));
      handleSearch(null)
    }
    }>{word}</span>
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      setGraphData({ nodes: [], links: [], isLoading:  true })
    }
  }, [])

  return (
    <>
    <div className='flex flex-col min-h-screen'>
    <main className="relative flex-1 flex flex-col grow m-auto justify-self-center items-center place-self-center h-full w-full">
      <div 
        id="search-controls" 
        className={`search-controls-container flex flex-col items-center
          ${graphData.nodes.length > 0 ? 'moved' : 'w-1/4'}`}
      >
        <div className="flex flex-col w-full mx-auto gap-8 sm:items-start">
          <header className="bg-white">
            <div className="mx-auto max-w-7xl">
              <h1 style={{ color: 'rgba(200, 200, 200, 0.8' }} className="text-5xl font-bold">Quest</h1>
            </div>
          </header>
          <ol className={`list-inside text-sm text-left font-[family-name:var(--font-geist-mono)] ${
        graphData.nodes.length > 0 ? 'hidden' : ''
          }`}>
            <li>Visual search</li>
          </ol>
        </div>

        <form onSubmit={handleSearch} className="flex gap-6 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your search query"
              className={`
                ${graphData.nodes.length > 0 ? 'w-52 transition-all' : 'w-1/4'} w-full py-2 pr-10 focus:border-blue-500 focus:outline-none`}
                />
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            type="submit"
            className="bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-50"
            disabled={isLoading}
            >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>
      <div id="results" ref={graphContainer} className={`flex-1 w-full items-center align-center m-auto scale-0 results-container ${
        graphData.nodes.length > 0 ? 'moved' : 'hidden'
      }`}>
      {!graphData.isLoading && graphData.nodes.length > 0 ?
        <ErrorBoundary FallbackComponent={ErrorFallback}>
        <GraphComponent
          id="graph-id"
          data={memoizedGraphData}
          onClickNode={handleNodeClick}
          onMouseOverNode={mouseOverNode}
          onMouseOutNode={mouseLeaveNode}
          onZoomChange={setZoom}
          config={config as Partial<GraphConfiguration<GraphNode, GraphLink>>}
        />
        </ErrorBoundary>

        : isLoading ? (
          "Loading..."
        ) : null}
        </div>
      </main>
      <footer className="h-24 flex gap-6 flex-wrap items-center justify-center">
        <div className="text-gray-400">
          Quest search
        </div>
      </footer>       
    </div>

    {isModalOpen && <div
    style={{
      zIndex: 9,
      border: "solid 1px",
      position: 'absolute',
      padding: '20px',
      top: '25%',
      right: '15%',
      backgroundColor: "rgba(100, 100, 100, 0.8)",
      maxWidth: "300px", margin: "auto" ,
    }}
    >
      <button style={{ position: 'absolute', padding: '10px', top: 0, right: '10px' }} onClick={handleModalClose}>x</button>
    {hoveredNode && (
      <div>
        <h2>{hoveredNode.title}</h2>
        <a href={hoveredNode.link} target="_blank">
          <img src={hoveredNode.image || undefined} alt={hoveredNode.title} style={{ width: "100%" }} />
          </a>
        <p>{hoveredNode.description.split(" ").map((word, idx) => <><HighlightQueryTerm key={idx} word={word} /> </>)}</p>
      </div>
    )}
    </div>}
    </>
  );
}

