import { ICompartment } from './apiModels';

export interface IPoint {
    id: number,
    penetrationId: string,
    x: number,
    y: number,
    z: number,
    compartment: ICompartment,

    alpha?: number[],
    color?: number[],
    radius?: number[],
}
