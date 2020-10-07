import axios, {AxiosResponse} from "axios";
import * as _ from "lodash";

// eslint-disable-next-line import/no-unresolved
import {Compartment} from "./apiModels";
// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../constants";
// eslint-disable-next-line import/no-unresolved
import {Predicate} from "./predicateModels";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesData} from "./timeseries";
// eslint-disable-next-line import/no-unresolved
import {UnitModel} from "./unitModel";

export interface PenetrationInterface {
    id: string;
    unitIds: number[];
    compartments: Compartment[];
    coordinates: number[];

    timeseriesIds: string[];
    unitStatIds: string[];
}

export class Penetration implements PenetrationInterface {
    private constants: AVConstants;

    // unit-indexed values
    private readonly _id: string;

    private _unitIds: number[];
    private _compartments: Compartment[]
    private _coordinates: number[];
    private _selected: boolean[];

    // timeseries/stat keys
    private readonly _timeseriesIds: string[];
    private readonly _unitStatIds: string[];

    // timeseries/stat values
    private _timeseries: Map<string, TimeseriesData>;
    private _unitStats: Map<string, number[]>;

    // unit models
    private unitModels: UnitModel[];

    constructor(id: string) {
        this.constants = new AVConstants();

        this._id = id;

        this._unitIds = [];
        this._compartments = [];
        this._coordinates = [];
        this._selected = [];

        this._timeseriesIds = [];
        this._unitStatIds = [];

        this._timeseries = new Map<string, TimeseriesData>();
        this._unitStats = new Map<string, number[]>();

        this.unitModels = [];
    }

    private constructUri(dataType: "unitStat" | "timeseries", dataId: string): string {
        const endpoint = this.constants.apiEndpoint;

        return `${endpoint}/${dataType}?penetrationId=${this.id}&${dataType}Id=${dataId}`;
    }

    private getSelectedSubset(data: any[]): any[] {
        const subset: any[] = [];
        data.forEach((val, idx) => {
            if (this._selected[idx]) {
                subset.push(val);
            }
        });

        return subset;
    }

    private makeUnitModels(): void {
        const unitModels: UnitModel[] = [];

        this.unitIds.forEach((uid, idx) => {
            unitModels.push(
                new UnitModel({
                    id: uid,
                    compartment: this.compartments[idx],
                    coordinates: this.getXYZ([uid]),
                    penetrationId: this.id
                })
            );
        });

        this.unitModels = unitModels;
    }

    public static fromResponse(data: PenetrationInterface): Penetration {
        const p = new Penetration(data.id);

        p.unitIds = data.unitIds;
        p.setSelected();
        p.assignCompartments(data.unitIds, data.compartments);
        p.assignCoordinates(data.unitIds, data.coordinates);
        p.makeUnitModels();

        data.timeseriesIds.forEach((tsid) => {
            p.registerTimeseries(tsid);
        });
        data.unitStatIds.forEach((usid) => {
            p.registerUnitStat(usid);
        });

        return p;
    }

    public assignCompartments(unitIds: number[], compartments: Compartment[]): void {
        unitIds.forEach((uid, idx) => {
            const localIdx = _.sortedIndexOf(this.unitIds, uid);

            if (localIdx > -1) {
                this._compartments[localIdx] = compartments[idx];
            }
        });
    }

    public assignCoordinates(unitIds: number[], coordinates: number[]): void {
        unitIds.forEach((uid, idx) => {
            const localIdx = _.sortedIndexOf(this.unitIds, uid);

            if (localIdx > -1) {
                this.coordinates[3  * localIdx] = coordinates[3 * idx];
                this.coordinates[3 * localIdx + 1] = coordinates[3 * idx + 1];
                this.coordinates[3 * localIdx + 2] = coordinates[3 * idx + 2];
            }
        });
    }

    public getCompartmentIds(selectedOnly = true): string[] {
        const compartmentIds = this.compartments.map((compartment) => {
            if (compartment) {
                return compartment.name;
            } else {
                return null;
            }
        });

        return selectedOnly ? this.getSelectedSubset(compartmentIds) : compartmentIds;
    }

    public getUnitIds(selectedOnly = true): number[] {
        const unitIds = this.unitIds;

        return selectedOnly ? this.getSelectedSubset(unitIds) : unitIds;
    }

    public async getTimeseries(timeseriesId: string): Promise<TimeseriesData> {
        if (this.hasTimeseriesLoaded(timeseriesId)) {
            return this._timeseries.get(timeseriesId);
        } else if (this.hasTimeseries(timeseriesId)) {
            const uri = this.constructUri("timeseries", timeseriesId);

            return axios.get(uri)
                .then((res) => res.data)
                .then((data: TimeseriesData) => {
                    this._timeseries.set(timeseriesId, data);

                    return data;
                });
        }
    }

    public async getUnitStat(unitStatId: string, selectedOnly = true): Promise<number[]> {
        if (this.hasUnitStatLoaded(unitStatId)) {
            const stat = this._unitStats.get(unitStatId);
            return selectedOnly ? this.getSelectedSubset(stat) : stat;
        } else if (this.hasUnitStat(unitStatId)) {
            const uri = this.constructUri("unitStat", unitStatId);

            return axios.get(uri)
                .then((res) => res.data)
                .then((data: {penetrationId: string; unitStatId: string; data: number[]}) => {
                    const stat = data.data;

                    // register stats with stat map, point models
                    this._unitStats.set(unitStatId, stat);
                    this.unitModels.forEach((pointModel, idx) => {
                        pointModel.setStat(unitStatId, stat[idx]);
                    });

                    return selectedOnly ? this.getSelectedSubset(stat) : stat;
                });
        } else {
            return null;
        }
    }

    public getXYZ(unitIds?: number[]): number[] {
        if (!unitIds) {
            return this.coordinates;
        }

        const coordinates: number[] = [];
        unitIds.forEach((uid) => {
            const idx = _.sortedIndexOf(this.unitIds, uid);
            coordinates.push(...this.coordinates.slice(3 * idx, 3 * (idx + 1)));
        });

        return coordinates;
    }

    public hasUnitStat(unitStatId: string): boolean {
        return this._unitStatIds.includes(unitStatId);
    }

    public hasUnitStatLoaded(unitStatId: string): boolean {
        return this._unitStats.has(unitStatId);
    }

    public hasTimeseries(timeseriesId: string): boolean {
        return this._timeseriesIds.includes(timeseriesId);
    }

    public hasTimeseriesLoaded(timeseriesId: string): boolean {
        return this._timeseries.has(timeseriesId);
    }

    public registerTimeseries(timeseriesId: string): void {
        if (!this._timeseriesIds.includes(timeseriesId)) {
            this._timeseriesIds.push(timeseriesId);
        }
    }

    public registerUnitStat(unitStatId: string): void {
        if (!this._unitStatIds.includes(unitStatId)) {
            this._unitStatIds.push(unitStatId);
        }
    }

    public setFilter(predicate: Predicate): void {
        if (predicate) {
            this._selected = predicate.eval(this.unitModels);
        } else {
            this._selected.fill(true);
        }
    }

    public setSelected(unitIds?: number[]): void {
        if (!unitIds) { // select everything
            this._selected.fill(true);
        } else {
            unitIds = _.intersection(this.unitIds, unitIds);
            unitIds.forEach((uid) => {
                const idx = _.sortedIndexOf(this.unitIds, uid);
                this._selected[idx] = true;
            });
        }
    }

    public setUnselected(unitIds?: number[]): void {
        if (!unitIds) { // unselect everything
            this._selected.fill(false);
        } else {
            unitIds = _.intersection(this.unitIds, unitIds);
            unitIds.forEach((uid) => {
                const idx = _.sortedIndexOf(this.unitIds, uid);
                this._selected[idx] = false;
            });
        }
    }

    public isSelected(unitId: number): boolean {
        const idx = _.sortedIndexOf(this.unitIds, unitId);
        if (idx === -1) {
            return false;
        }

        return this._selected[idx];
    }

    public get id(): string {
        return this._id;
    }

    public get coordinates(): number[] {
        return this._coordinates;
    }

    public get unitIds(): number[] {
        return this._unitIds;
    }

    public set unitIds(vals) {
        this._unitIds = vals.slice().sort();

        // clear out unit-indexed values
        this._compartments = new Array<Compartment>(this.nUnits);
        this._coordinates = new Array<number>(3 * this.nUnits);
        this._selected = new Array<boolean>(this.nUnits);
    }

    public get compartments(): Compartment[] {
        return this._compartments;
    }

    public get timeseriesIds(): string[] {
        return this._timeseriesIds;
    }

    public get unitStatIds(): string[] {
        return this._unitStatIds;
    }

    public get nUnits(): number {
        return this._unitIds.length;
    }

    public get selectedUnits(): number[] {
        const unitIds: number[] = [];

        this._selected.forEach((selected, idx) => {
            if (selected) {
                unitIds.push(this.unitIds[idx]);
            }
        });

        return unitIds;
    }

    public get visible(): number[] {
        return this._selected.map((p) => Number(p));
    }
}
