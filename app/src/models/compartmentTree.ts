import * as _ from 'underscore';

import { ICompartment, ICompartmentNode, ISettingsResponse } from './apiModels';

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
        return compartments.map((node: ICompartmentNode) => _.pick(node, _.without(_.keys(node), 'children')) as ICompartment);
    }

    public getCompartmentSubset(settings: ISettingsResponse): ICompartmentNode[] {
        const cSettings = settings.compartment;

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

    public getCompartmentSubsetTree(settings: ISettingsResponse): ICompartmentNode {
        let rootNode: any = this.getCompartmentByName('root');
        rootNode.children = [];

        return rootNode;
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
