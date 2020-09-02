import { ICompartment } from './apiModels';


interface IPointSummary {
    compartment: ICompartment,
    coordinates: number[],
    id: number,
    penetrationId: string,
}

export class PointModel {
    private summary: IPointSummary;
    private stats: Map<string, number>;

    constructor(summary: IPointSummary) {
        this.summary = summary;
        this.stats = new Map<string, number>();
    }

    public get compartmentName() {
        return this.summary.compartment ? this.summary.compartment.name : null;
    }

    public get coordinates() {
        return this.summary.coordinates ? this.summary.coordinates.slice() : [];
    }

    public get id() {
        return this.summary.id;
    }

    public get penetrationId() {
        return this.summary.penetrationId;
    }

    public getStat(name: string) {
        return this.stats.has(name) ? this.stats.get(name) : NaN;
    }

    public setStat(name: string, value: number) {
        this.stats.set(name, value);
    }
}