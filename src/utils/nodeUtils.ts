import { GraphLink } from "react-d3-graph";
import { Node } from "@/types"
import { v4 as uuidv4 } from 'uuid'; // You can install uuid with `npm install uuid`

// Helper function to check if nodes are similar (based on URL or other unique identifier)
const areSimilarNodes = (node1: Node, node2: Node) => {
  // You can customize this based on what makes nodes "similar" in your application
  return node1.link === node2.link || node1.id === node2.id;
};

// Helper function to find existing similar node
export const findExistingNode = (newNode: Node, existingNodes: Node[]) => {
  const existingNode = existingNodes.find(existingNode => areSimilarNodes(existingNode, newNode));
  console.debug('existing node? ', existingNode)
  return existingNode
};

// Modify the function to generate a unique ID if necessary
export const ensureUniqueNodeId = (nodeId?: string, depth:number): string => {
  return nodeId ? nodeId : `${depth}-${uuidv4()}`;  // Generate a new UUID if the nodeId is empty or undefined
};

export const addNodeWithDepth = (
  nodes: Node[], 
  links: GraphLink[], 
  parentNodeId: string | null, 
  depth: number
): [Node[], GraphLink[]] => {
  const processedNodes = new Map<string, Node>();
  const processedLinks = new Set<string>();

  // First pass: process all nodes
  nodes.forEach((node) => {
    const nodeId = ensureUniqueNodeId(node.id, depth);
    if (!processedNodes.has(nodeId)) {
      processedNodes.set(nodeId, {
        ...node,
        id: nodeId,
        depth: depth,
        visible: true
      });
    }
  });

  // Second pass: process all links
  links.forEach((link) => {
    const linkId = `${link.source}-${link.target}`;
    const reverseLinkId = `${link.target}-${link.source}`;
    
    if (!processedLinks.has(linkId) && !processedLinks.has(reverseLinkId)) {
      processedLinks.add(linkId);
    }
  });

  return [
    Array.from(processedNodes.values()),
    Array.from(processedLinks).map(linkId => {
      const [source, target] = linkId.split('-');
      return { source, target };
    })
  ];
};