// eslint-disable-next-line import/no-unresolved
import { Compartment } from "./apiModels";

interface UnitSummary {
    id: number;
    compartment: Compartment;
    coordinates: number[];
    penetrationId: string;
}

export class UnitModel {
    private summary: UnitSummary;
    private stats: Map<string, number>;

    constructor(summary: UnitSummary) {
        this.summary = summary;
        this.stats = new Map<string, number>();
    }

    public getUnitStat(name: string): number {
        return this.stats.has(name) ? this.stats.get(name) : NaN;
    }

    public setStat(name: string, value: number): void {
        this.stats.set(name, value);
    }

    public get compartmentId(): number {
        return this.summary.compartment ? this.summary.compartment.id : 0;
    }

    public get compartmentIdPath(): number[] {
        return this.summary.compartment ? this.summary.compartment.structureIdPath : [];
    }

    public get compartmentName(): string {
        return this.summary.compartment ? this.summary.compartment.name : null;
    }

    public get id(): number {
        return this.summary.id;
    }

    public get penetrationId(): string {
        return this.summary.penetrationId;
    }

    public get x(): number {
        return this.summary.coordinates ? this.summary.coordinates[0] : Number.NaN;
    }

    public get y(): number {
        return this.summary.coordinates ? this.summary.coordinates[1] : Number.NaN;
    }

    public get z(): number {
        return this.summary.coordinates ? this.summary.coordinates[2] : Number.NaN;
    }
}
