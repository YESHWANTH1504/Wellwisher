/**
 * PersonalKnowledgeGraph
 * Graph of explicit non-sensitive relationships between People, Events, Tasks, Goals, and Documents.
 */
class PersonalKnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(nodeId, type, data = {}) {
    const node = { id: nodeId, type, data, createdAt: new Date().toISOString() };
    this.nodes.set(nodeId, node);
    return node;
  }

  addEdge(sourceId, targetId, relationship, metadata = {}) {
    const edge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceId,
      targetId,
      relationship,
      metadata,
      createdAt: new Date().toISOString()
    };
    this.edges.push(edge);
    return edge;
  }

  getRelatedNodes(nodeId, relationship = null) {
    const relatedEdgeTargets = this.edges
      .filter(e => e.sourceId === nodeId && (!relationship || e.relationship === relationship))
      .map(e => e.targetId);

    return relatedEdgeTargets.map(id => this.nodes.get(id)).filter(Boolean);
  }

  queryPersonContext(personName) {
    const personNode = Array.from(this.nodes.values()).find(
      n => n.type === 'PERSON' && n.data?.name?.toLowerCase() === personName.toLowerCase()
    );
    if (!personNode) return null;

    const relatedEvents = this.getRelatedNodes(personNode.id, 'ATTENDS');
    const relatedTasks = this.getRelatedNodes(personNode.id, 'COLLABORATES_ON');

    return {
      person: personNode,
      events: relatedEvents,
      tasks: relatedTasks
    };
  }
}

module.exports = new PersonalKnowledgeGraph();
