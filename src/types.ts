import { GraphLink } from "react-d3-graph";

export interface Node {
  id: string;
  title: string;
  image: string | undefined;
  link: string;
  description: string;
  keywords: string[];
  visible: boolean;
  depth: number;
}

export interface GraphData {
    nodes: Node[], 
    links: GraphLink[];
    isLoading: boolean;
    focusedNodeId?: string;
}