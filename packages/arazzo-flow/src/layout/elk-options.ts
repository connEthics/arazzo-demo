/**
 * Options ELK exactes du graphe Arazzo (R5 §4.8, reprises dans UI-SPEC.md §5).
 * Valeurs sous forme de chaînes, clés complètes `org.eclipse.elk.*`.
 */
export const ELK_ROOT_OPTIONS = {
  'org.eclipse.elk.algorithm': 'layered',
  'org.eclipse.elk.direction': 'DOWN', // 'RIGHT' en mode LR
  'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
  'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'org.eclipse.elk.layered.cycleBreaking.strategy': 'MODEL_ORDER',
  'org.eclipse.elk.layered.feedbackEdges': 'true',
  'org.eclipse.elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'org.eclipse.elk.layered.mergeEdges': 'false',
  'org.eclipse.elk.layered.thoroughness': '7', // remplacé par thoroughnessFor(n) : 7 jusqu'à 30 nœuds, 4 au-delà
  'org.eclipse.elk.spacing.nodeNode': '32',
  'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '56',
  'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers': '12',
  'org.eclipse.elk.spacing.edgeNode': '20',
  'org.eclipse.elk.spacing.edgeEdge': '12',
  'org.eclipse.elk.spacing.edgeLabel': '6',
  'org.eclipse.elk.spacing.componentComponent': '48',
  'org.eclipse.elk.separateConnectedComponents': 'true',
  'org.eclipse.elk.padding': '[top=24,left=24,bottom=24,right=24]',
  'org.eclipse.elk.edgeLabels.placement': 'CENTER',
  'org.eclipse.elk.edgeLabels.inline': 'true',
  'org.eclipse.elk.layered.edgeRouting.selfLoopDistribution': 'EQUALLY',
  'org.eclipse.elk.layered.edgeRouting.selfLoopOrdering': 'STACKED',
  // Coordonnées absolues : le rendu React Flow est « à plat » (pas de parentId).
  'org.eclipse.elk.json.shapeCoords': 'ROOT',
  'org.eclipse.elk.json.edgeCoords': 'ROOT',
} as const;

export const ELK_NODE_OPTIONS = {
  'org.eclipse.elk.portConstraints': 'FIXED_SIDE',
} as const;

export const ELK_GROUP_OPTIONS = {
  'org.eclipse.elk.padding': '[top=44,left=16,bottom=16,right=16]',
  'org.eclipse.elk.nodeSize.constraints': 'MINIMUM_SIZE',
  'org.eclipse.elk.portConstraints': 'FREE',
} as const;

/**
 * Mesuré en D1 (Chromium, worker chaud) : thoroughness 10 → ~30 ms (11 nœuds), ~90 ms (pet-adoption, 12 nœuds,
 * 9 libellés, 4 arêtes arrière) ; 66 nœuds : 7 → ~230 ms, 4 → ~120 ms. D'où des paliers plus bas que R5 (10/7/4).
 */
export function thoroughnessFor(nodeCount: number): string {
  return nodeCount <= 30 ? '7' : '4';
}
