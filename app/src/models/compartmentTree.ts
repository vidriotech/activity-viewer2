// eslint-disable-next-line import/no-unresolved
import {CompartmentNodeInterface} from "./apiModels";

export class CompartmentNode implements CompartmentNodeInterface {
    protected _acronym: string;
    protected _rgbTriplet: [number, number, number];
    protected _graphId: number;
    protected _graphOrder: number;
    protected _id: number;
    protected _name: string;
    protected _structureIdPath: number[];
    protected _structureSetIds: number[];
    protected _children: CompartmentNode[];

    private _nDescendentPenetrations: number;
    private _nDescendentUnits: number;

    private penetrationUnits: Map<string, Set<number>>;

    constructor() {
        this._acronym = "";
        this._rgbTriplet = [0, 0, 0];
        this._graphId = -1;
        this._graphOrder = -1;
        this._id = -1;
        this._name = "";
        this._structureIdPath = [];
        this._structureSetIds = [];
        this._children = [];

        this._nDescendentPenetrations = -1;
        this._nDescendentUnits = -1;

        this.penetrationUnits = new Map<string, Set<number>>();
    }

    public static fromResponse(node: CompartmentNodeInterface): CompartmentNode {
        const n = new CompartmentNode();
        n._acronym = node.acronym;
        n._rgbTriplet = node.rgbTriplet.slice() as [number, number, number];
        n._graphId = node.graphId;
        n._graphOrder = node.graphOrder;
        n._id = node.id;
        n._name = node.name;
        n._structureIdPath = node.structureIdPath.slice();
        n._structureSetIds = node.structureSetIds.slice();

        const children: CompartmentNode[] = [];
        node.children.forEach((child) => {
            children.push(CompartmentNode.fromResponse(child));
        });

        n._children = children;

        return n;
    }

    public registerUnit(penetrationId: string, unitId: number): void {
        if (!this.penetrationUnits.has(penetrationId)) {
            this.penetrationUnits.set(penetrationId, new Set([unitId]));
        } else {
            this.penetrationUnits.get(penetrationId).add(unitId);
        }
    }

    public nExactPenetrations(): number {
        return this.penetrationUnits.size;
    }

    public nExactUnits(): number {
        let sum = 0;
        this.penetrationUnits.forEach((units) => {
            sum += units.size;
        });

        return sum;
    }

    public nDescendentPenetrations(): number {
        let sum = this.nExactPenetrations();
        this.children.forEach((child) => {
            sum += child.nDescendentPenetrations();
        });

        return sum;
    }

    public nDescendentUnits(): number {
        let sum = this.nExactUnits();
        this.children.forEach((child) => {
            sum += child.nDescendentUnits();
        });

        return sum;
    }

    public get acronym(): string {
        return this._acronym;
    }

    public get children(): CompartmentNode[] {
        return this._children;
    }

    public get rgbTriplet(): [number, number, number] {
        return this._rgbTriplet.slice() as [number, number, number];
    }

    public get graphId(): number {
        return this._graphId;
    }

    public get graphOrder(): number {
        return this._graphOrder;
    }

    public get id(): number {
        return this._id;
    }

    public get name(): string {
        return this._name;
    }

    public get structureIdPath(): number[] {
        return this._structureIdPath.slice();
    }

    public get structureSetIds(): number[] {
        return this._structureSetIds.slice();
    }
}

export class CompartmentTree2 {
    protected rootNode: CompartmentNode;

    protected id2Node: Map<number, CompartmentNode>;
    protected name2Id: Map<string, number>;
    protected acronym2Id: Map<string, number>;

    constructor() {
        this.rootNode = null;
        this.id2Node = new Map<number, CompartmentNode>();
        this.name2Id = new Map<string, number>();
        this.acronym2Id = new Map<string, number>();
    }

    public static fromCompartmentNode(root: CompartmentNodeInterface): CompartmentTree2 {
        const c = new CompartmentTree2();

        c.rootNode = CompartmentNode.fromResponse(root);
        const queue = [c.rootNode];
        while (queue.length > 0) {
            const node = queue.splice(0, 1)[0];
            c.id2Node.set(node.id, node);
            c.name2Id.set(node.name, node.id);
            c.acronym2Id.set(node.acronym, node.id);
        }
        return c;
    }

    public getAllCompartmentNames(): string[] {
        return Array.from(this.name2Id.keys());
    }

    public getAllCompartmentNodes(): IterableIterator<CompartmentNode> {
        return this.id2Node.values();
    }

    public getCompartmentNodeByName(nodeName: string): CompartmentNode {
        if (this.name2Id.has(nodeName)) {
            return this.id2Node.get(this.name2Id.get(nodeName));
        } else if (this.acronym2Id.has(nodeName)) {
            return this.id2Node.get(this.acronym2Id.get(nodeName));
        }

        return null;
    }
}