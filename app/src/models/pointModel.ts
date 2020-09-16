import { Compartment } from './apiModels';


interface IPointSummary {
    compartment: Compartment,
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

    public getStat(name: string) {
        return this.stats.has(name) ? this.stats.get(name) : NaN;
    }

    public setStat(name: string, value: number) {
        this.stats.set(name, value);
    }

    public get compartmentId() {
        return this.summary.compartment ? this.summary.compartment.id : null;
    }

    public get compartmentIdPath() {
        return this.summary.compartment ? this.summary.compartment.structure_id_path : null;
    }

    public get compartmentName() {
        return this.summary.compartment ? this.summary.compartment.name : null;
    }

    public get id() {
        return this.summary.id;
    }

    public get penetrationId() {
        return this.summary.penetrationId;
    }

    public get x() {
        return this.summary.coordinates ? this.summary.coordinates[0] : Number.NaN;
    }

    public get y() {
        return this.summary.coordinates ? this.summary.coordinates[1] : Number.NaN;
    }

    public get z() {
        return this.summary.coordinates ? this.summary.coordinates[2] : Number.NaN;
    }
}