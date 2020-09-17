// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "./colorMap";

export interface ScalarMapping {
    timeseriesId: string;
    times: number[];
    values: number[];
}

export interface ColorMapping extends ScalarMapping {
    colorLUT: ColorLUT;
}

export interface AestheticMapping {
    penetrationId: string;
    color: ColorMapping;
    opacity: ScalarMapping;
    radius: ScalarMapping;
    visibility: number[];
}
