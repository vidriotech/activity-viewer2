import { ICompartmentNode } from './api';
import { ICompartment } from './compartmentModel';

export class CompartmentTree {
    private root: ICompartmentNode;

    constructor(root: ICompartmentNode) {
        this.root = root;
    }

    public getCompartmentNodesByDepth(maxDepth: number): ICompartmentNode[] {
        let compartments: ICompartmentNode[] = [this.root];

        let node;
        let currentQueue = [this.root];
        let nextQueue: ICompartmentNode[] = [];
        for (let depth = 0; depth < maxDepth; depth++) {
            while (currentQueue.length > 0) {
                node = currentQueue.splice(0, 1)[0];
                nextQueue = nextQueue.concat(node.children);
                compartments.push(node);
            }

            nextQueue = currentQueue;
        }

        return compartments;
    }

    public getCompartmentsByDepth(maxDepth: number): ICompartment[] {
        let compartments = this.getCompartmentNodesByDepth(maxDepth);
        return compartments.map(c => ({
            id: c.id,
            acronym: c.acronym,
            name: c.name,
            rgb_triplet: c.rgb_triplet,
        }));
    }

    private getCompartmentNodesByAttr(attr: keyof(ICompartmentNode), vals: any[]) {
        let nodes: ICompartmentNode[] = [];
        let queue = [this.root];

        while (queue.length > 0) {
            let node = queue.splice(0, 1)[0];
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

    private getCompartmentNodeByAttr(attr: keyof(ICompartmentNode), val: number | string): ICompartmentNode {
        let nodes = this.getCompartmentNodesByAttr(attr, [val]);

        return nodes.length === 0 ? null : nodes[0];
    }

    private getCompartmentsByAttr(attr: keyof(ICompartmentNode), vals: any[]): ICompartment[] {
        let nodes = this.getCompartmentNodesByAttr(attr, vals);

        return nodes.map((node) => ({
            id: node. id,
            acronym: node.acronym,
            name: node.name,
            rgb_triplet: node.rgb_triplet
        }));
    }

    private getCompartmentByAttr(attr: keyof(ICompartmentNode), val: number | string): ICompartment {
        let nodes = this.getCompartmentsByAttr(attr, [val]);

        return nodes.length === 0 ? null : nodes[0];
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
