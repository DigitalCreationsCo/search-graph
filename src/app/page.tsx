/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client"
import { Search } from "lucide-react";
import dynamic from 'next/dynamic';
import { GraphConfiguration, GraphLink, GraphNode } from "react-d3-graph";
import axios from "axios";
import { useEffect, useState } from "react";

const Graph = dynamic(() => import('react-d3-graph').then(mod => mod.Graph), { ssr: false });

export default function Home() {
  const [query, setQuery] = useState('');
  const [graphData, setGraphData] = useState<{nodes:any[], links: any[]; isLoading: boolean}>({ nodes: [], links: [], isLoading: true });
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    try {
      setIsLoading(true);
      if (!query) throw new Error("Query error")

        const response = await axios(`/api/search`, {
          params: { query, max_results: 10 }, headers: {
            'Content-Type': 'application/json'
          }
        });
        const nodes = response.data.nodes.map((node, idx) => {
          console.info(`node ${idx}: `, {
            id: node.id || `node-${idx}`,
            title: node.title,
            image: node.image || null, 
            link: node.link,
            description: node.description, 
          })
          return {
          id: node.id || `node-${idx}`,
          title: node.title,
          image: node.image || null, 
          link: node.link,
          description: node.description, 
        }});
        const links = nodes.slice(1).map((node) => {
          return {
          source: nodes[0].id,
          target: node.id,
        }}); // Simple linear links for now
        
        setGraphData({ 
          nodes: [...nodes], 
          links: [...links], 
          isLoading: false 
        });

    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      setGraphData({ nodes: [], links: [], isLoading:  true })
    }
  }, [])

  const config: Partial<GraphConfiguration<GraphNode & {title:string; image: string; description: string}, GraphLink>> = {
    // height: window.innerHeight || 600,
    // width: window.innerWidth || 1000,
    height: 600,
    width: 1000,
    node: {
      labelProperty: "title",
      renderLabel: true,
      fontSize: 12,
      viewGenerator: (node) => (
          <foreignObject x="25" y="25" width="100" height="100">
            <div style={{ textAlign: "center" }}>
              <img
                src={node.image}
                alt={node.title}
                style={{ width: "100px", height: "100px" }}
                />
              <div>{node.title}</div>
            </div>
          </foreignObject>
      ),
    },
    link: { renderLabel: false },
    directed: true,
  }

  return (
    <div className="w-full h-full border">
      <h1>Search Graph</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Surf the web..."
      />
      <button type='submit' onClick={handleSearch}>Search</button>
      {!graphData.isLoading && <Graph
        id="graph-id"
        data={graphData}
        config={config as unknown as Partial<GraphConfiguration<GraphNode, GraphLink>>}
      /> || "Loading..."}
    </div>
  );
}