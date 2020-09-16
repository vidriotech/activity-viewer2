import * as _ from 'underscore';

// eslint-disable-next-line import/no-unresolved
import { Compartment, CompartmentNode, AVSettings } from "./models/apiModels";
// eslint-disable-next-line import/no-unresolved
import { CompartmentNodeView } from "./viewmodels/compartmentViewModel";

export class CompartmentTree {
    private readonly root: CompartmentNode;
    private settings: AVSettings;

    constructor(root: CompartmentNode, settings: AVSettings) {
        this.root = root;
        this.settings = settings;
    }

    private getCompartmentNodesByAttr(attr: keyof(CompartmentNode), vals: any[]): CompartmentNode[] {
        const nodes: CompartmentNode[] = [];
        let queue = [this.root];

        while (queue.length > 0) {
            const node = queue.splice(0, 1)[0];
            queue = queue.concat(node.children);

            if (vals.includes(node[attr])) {
                nodes.push(node);
            }

            if (nodes.length === vals.length) {
                break;
            }
        }

        return nodes;
    }

    private getCompartmentNodeByAttr(attr: keyof(CompartmentNode), val: number | string): CompartmentNode {
        const nodes = this.getCompartmentNodesByAttr(attr, [val]);
        return nodes.length === 0 ? null : nodes[0];
    }

    private getCompartmentsByAttr(attr: keyof(CompartmentNode), vals: any[]): Compartment[] {
        const nodes = this.getCompartmentNodesByAttr(attr, vals);
        return nodes.map((node: CompartmentNode) => _.pick(node, _.without(_.keys(node), 'children')) as Compartment);
    }

    private getCompartmentByAttr(attr: keyof(CompartmentNode), val: number | string): Compartment {
        const nodes = this.getCompartmentsByAttr(attr, [val]);
        return nodes.length === 0 ? null : nodes[0];
    }

    public getCompartmentNodesByDepth(maxDepth: number): CompartmentNode[] {
        const compartments: CompartmentNode[] = [];

        let node;
        let currentLevel = [this.root];
        let nextLevel: CompartmentNode[] = [];

        for (let depth = 0; depth < maxDepth + 1; depth++) {
            while (currentLevel.length > 0) {
                node = currentLevel.splice(0, 1)[0];
                nextLevel = nextLevel.concat(node.children);
                compartments.push(node);
            }

            currentLevel = nextLevel;
        }

        return compartments;
    }

    public getCompartmentNodeViewTree(subset: boolean): CompartmentNodeView {
        const root: CompartmentNode = subset ?
            this.getCompartmentSubsetTree() :
            this.root;

        const node2NodeView = (node: CompartmentNode): CompartmentNodeView => {
            return {
                acronym: node.acronym,
                id: node.id,
                name: node.name,
                isVisible: false,
                rgbTriplet: node.rgb_triplet,
                structureIdPath: node.structure_id_path,
                children: node.children.map(node2NodeView),
            }
        };

        return node2NodeView(root);
    }

    public getCompartmentsByDepth(maxDepth: number): Compartment[] {
        const compartments = this.getCompartmentNodesByDepth(maxDepth);
        return compartments.map((node: CompartmentNode) => _.pick(node, _.without(_.keys(node), 'children')) as Compartment);
    }

    public getCompartmentSubset(): CompartmentNode[] {
        const cSettings = this.settings.compartment;

        const compartmentNodes = this.getCompartmentNodesByDepth(cSettings.maxDepth);

        // remove compartments in `exclude`
        cSettings.exclude.forEach((compId: string) => {
            let idx = compartmentNodes.map((comp) => comp.name).indexOf(compId); // search names
            if (idx === -1) {
                idx = compartmentNodes.map((comp) => comp.acronym).indexOf(compId); // search acronyms
            }

            if (idx !== -1) {
                // remove child compartments
                compartmentNodes.splice(idx, 1);
                compartmentNodes.forEach(node => {
                    const childIdx = compartmentNodes.map((comp) => comp.name).indexOf(node.name);
                    if (childIdx !== -1) {
                        compartmentNodes.splice(childIdx, 1);
                    }
                });
            }
        });

        // add compartments in `include`
        cSettings.include.forEach((compId: string) => {
            let comp = this.getCompartmentNodeByName(compId);
            if (comp === null) {
                comp = this.getCompartmentNodeByAcronym(compId);
            }

            if (comp !== null) {
                compartmentNodes.push(comp);
            }
        });

        return compartmentNodes;
    }

    public getCompartmentSubsetTree(): CompartmentNode {
        /* 
         * Note depths of all compartments in subset.
         * Sort by depth, ascending.
         * Pop root node off and emplace.
         * For each node, traverse the structure id path array and emplace ancestors as necessary.
        */
        const subset = this.getCompartmentSubset();
        if (subset.length === 0) {
            return this.root;
        }

        subset.sort((left, right) => left.structure_id_path.length - right.structure_id_path.length);

        // root node is always required in the tree
        let refRoot: CompartmentNode;
        if (subset[0].name !== 'root') {
            refRoot = this.getCompartmentNodeByName('root');
        } else {
            refRoot = subset.splice(0, 1)[0];
        }

        const rootNode: CompartmentNode = _.extend(
            _.pick(refRoot, _.without(_.keys(refRoot), 'children')),
            {'children': []}
        )

        let node: CompartmentNode;
        while (subset.length > 0) {
            node = subset.splice(0, 1)[0];
            let levelNode = rootNode;

            for (let i = 1; i < node.structure_id_path.length; i++) {
                const childIds = levelNode.children.map(child => child.id);
                const pathId = node.structure_id_path[i];

                let idx = childIds.indexOf(pathId);
                if (idx === -1) {
                    levelNode.children.push(this.getCompartmentNodeById(pathId));
                    idx = levelNode.children.length - 1;
                }

                levelNode = levelNode.children[idx];
            }
        }

        return rootNode;
    }

    public getCompartmentsByName(names: string[]): Compartment[] {
        return this.getCompartmentsByAttr('name', names);
    }

    public getCompartmentByName(name: string): Compartment {
        return this.getCompartmentByAttr('name', name);
    }

    public getCompartmentNodesByName(names: string[]): CompartmentNode[] {
        return this.getCompartmentNodesByAttr('name', names);
    }

    public getCompartmentNodeByName(name: string): CompartmentNode {
        return this.getCompartmentNodeByAttr('name', name);
    }

    public getCompartmentsByAcronym(acronyms: string[]): Compartment[] {
        return this.getCompartmentsByAttr('acronym', acronyms);
    }

    public getCompartmentByAcronym(acronym: string): Compartment {
        return this.getCompartmentByAttr('acronym', acronym);
    }

    public getCompartmentNodesByAcronym(acronyms: string[]): CompartmentNode[] {
        return this.getCompartmentNodesByAttr('acronym', acronyms);
    }

    public getCompartmentNodeByAcronym(acronym: string): CompartmentNode {
        return this.getCompartmentNodeByAttr('acronym', acronym);
    }

    public getCompartmentsById(ids: number[]): Compartment[] {
        return this.getCompartmentsByAttr('id', ids);
    }

    public getCompartmentById(id: number): Compartment {
        return this.getCompartmentByAttr('id', id);
    }

    public getCompartmentNodesById(ids: number[]): CompartmentNode[] {
        return this.getCompartmentNodesByAttr('id', ids);
    }

    public getCompartmentNodeById(id: number): CompartmentNode {
        return this.getCompartmentNodeByAttr('id', id);
    }
}
