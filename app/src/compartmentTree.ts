import * as _ from 'underscore';

import { ICompartment, ICompartmentNode, ISettingsResponse } from './models/apiModels';
import { ICompartmentNodeView } from './viewmodels/compartmentViewModel';

export class CompartmentTree {
    private root: ICompartmentNode;
    private settings: ISettingsResponse;

    constructor(root: ICompartmentNode, settings: ISettingsResponse) {
        this.root = root;
        this.settings = settings;
    }

    private getCompartmentNodesByAttr(attr: keyof(ICompartmentNode), vals: any[]) {
        let nodes: ICompartmentNode[] = [];
        let queue = [this.root];

        while (queue.length > 0) {
            let node = queue.splice(0, 1)[0];
            if (node.hasOwnProperty('children')) {
                queue = queue.concat(node.children);
            } else {
                console.log(node);
            }

            if (vals.includes(node[attr])) {
                nodes.push(node);
            }

            if (nodes.length === vals.length) {
                break;
            }
        }

        return nodes;
    }

    private getCompartmentNodeByAttr(attr: keyof(ICompartmentNode), val: number | string): ICompartmentNode {
        let nodes = this.getCompartmentNodesByAttr(attr, [val]);

        return nodes.length === 0 ? null : nodes[0];
    }

    private getCompartmentsByAttr(attr: keyof(ICompartmentNode), vals: any[]): ICompartment[] {
        let nodes = this.getCompartmentNodesByAttr(attr, vals);

        return nodes.map((node: ICompartmentNode) => _.pick(node, _.without(_.keys(node), 'children')) as ICompartment);
    }

    private getCompartmentByAttr(attr: keyof(ICompartmentNode), val: number | string): ICompartment {
        let nodes = this.getCompartmentsByAttr(attr, [val]);

        return nodes.length === 0 ? null : nodes[0];
    }

    public getCompartmentNodesByDepth(maxDepth: number): ICompartmentNode[] {
        let compartments: ICompartmentNode[] = [];

        let node;
        let currentLevel = [this.root];
        let nextLevel: ICompartmentNode[] = [];

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

    public getCompartmentNodeViewTree(subset: boolean): ICompartmentNodeView {
        let root: ICompartmentNode = subset ?
            this.getCompartmentSubsetTree() :
            this.root;

        const node2NodeView = (node: ICompartmentNode): ICompartmentNodeView => {
            return {
                acronym: node.acronym,
                id: node.id,
                name: node.name,
                isVisible: false,
                rgbTriplet: node.rgb_triplet,
                children: node.children.map(node2NodeView),
            }
        };

        return node2NodeView(root);
    }

    public getCompartmentsByDepth(maxDepth: number): ICompartment[] {
        let compartments = this.getCompartmentNodesByDepth(maxDepth);
        return compartments.map((node: ICompartmentNode) => _.pick(node, _.without(_.keys(node), 'children')) as ICompartment);
    }

    public getCompartmentSubset(): ICompartmentNode[] {
        const cSettings = this.settings.compartment;

        let compartmentNodes = this.getCompartmentNodesByDepth(cSettings.maxDepth);

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

    public getCompartmentSubsetTree(): ICompartmentNode {
        /* 
         * Note depths of all compartments in subset.
         * Sort by depth, ascending.
         * Pop root node off and emplace.
         * For each node, traverse the structure id path array and emplace ancestors as necessary.
        */
        let subset = this.getCompartmentSubset();
        if (subset.length === 0) {
            return this.root;
        }

        subset.sort((left, right) => left.structure_id_path.length - right.structure_id_path.length);

        // root node is always required in the tree
        let refRoot: ICompartmentNode;
        if (subset[0].name !== 'root') {
            refRoot = this.getCompartmentNodeByName('root');
        } else {
            refRoot = subset.splice(0, 1)[0];
        }

        let rootNode: ICompartmentNode = _.extend(
            _.pick(refRoot, _.without(_.keys(refRoot), 'children')),
            {'children': []}
        )

        let node: ICompartmentNode;
        while (subset.length > 0) {
            let node = subset.splice(0, 1)[0];
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

    public getCompartmentsByName(names: string[]): ICompartment[] {
        return this.getCompartmentsByAttr('name', names);
    }

    public getCompartmentByName(name: string): ICompartment {
        return this.getCompartmentByAttr('name', name);
    }

    public getCompartmentNodesByName(names: string[]): ICompartmentNode[] {
        return this.getCompartmentNodesByAttr('name', names);
    }

    public getCompartmentNodeByName(name: string): ICompartmentNode {
        return this.getCompartmentNodeByAttr('name', name);
    }

    public getCompartmentsByAcronym(acronyms: string[]): ICompartment[] {
        return this.getCompartmentsByAttr('acronym', acronyms);
    }

    public getCompartmentByAcronym(acronym: string): ICompartment {
        return this.getCompartmentByAttr('acronym', acronym);
    }

    public getCompartmentNodesByAcronym(acronyms: string[]): ICompartmentNode[] {
        return this.getCompartmentNodesByAttr('acronym', acronyms);
    }

    public getCompartmentNodeByAcronym(acronym: string): ICompartmentNode {
        return this.getCompartmentNodeByAttr('acronym', acronym);
    }

    public getCompartmentsById(ids: number[]): ICompartment[] {
        return this.getCompartmentsByAttr('id', ids);
    }

    public getCompartmentById(id: number): ICompartment {
        return this.getCompartmentByAttr('id', id);
    }

    public getCompartmentNodesById(ids: number[]): ICompartmentNode[] {
        return this.getCompartmentNodesByAttr('id', ids);
    }

    public getCompartmentNodeById(id: number): ICompartmentNode {
        return this.getCompartmentNodeByAttr('id', id);
    }
}
