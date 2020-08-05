import { ICompartmentNode } from "./api";
import { ICompartment } from "./compartmentModel";

export class CompartmentTree {
    private root: ICompartmentNode;

    constructor(root: ICompartmentNode) {
        this.root = root;
    }

    public getCompartmentsByDepth(maxDepth: number): ICompartment[] {
        let compartments: ICompartment[] = [{
            id: this.root.id,
            acronym: this.root.acronym,
            name: this.root.name,
            rgb_triplet: this.root.rgb_triplet
        }];

        let node;
        let currentQueue = [this.root];
        let nextQueue: ICompartmentNode[] = [];
        for (let depth = 0; depth < maxDepth; depth++) {
            while (currentQueue.length > 0) {
                node = currentQueue.splice(0, 1)[0];
                nextQueue = nextQueue.concat(node.children);

                compartments.push({
                    id: node.id,
                    acronym: node.acronym,
                    name: node.name,
                    rgb_triplet: node.rgb_triplet
                });
            }

            nextQueue = currentQueue;
        }

        return compartments;
    }

    private getCompartmentByAttr(attr: keyof(ICompartmentNode), val: number | string): ICompartment {
        let node;
        let queue = [this.root];
        while (queue.length > 0) {
            node = queue.splice(0, 1)[0];
            queue = queue.concat(node.children);

            if (node[attr] === val) {
                return ({
                    id: node.id,
                    acronym: node.acronym,
                    name: node.name,
                    rgb_triplet: node.rgb_triplet
                });
            }
        }

        return null;
    }

    public getCompartmentByName(name: string): ICompartment {
        return this.getCompartmentByAttr("name", name);
    }

    public getCompartmentByAcronym(acronym: string): ICompartment {
        return this.getCompartmentByAttr("acronym", acronym);
    }

    public getCompartmentById(id: number): ICompartment {
        return this.getCompartmentByAttr("id", id);
    }
}
