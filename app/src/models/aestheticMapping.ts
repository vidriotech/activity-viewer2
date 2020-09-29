// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "./colorMap";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesData} from "./timeseries";

export type AestheticSelection = "colorTimeseries" | "opacityTimeseries" | "radiusTimeseries";
export type AestheticType = "color" | "opacity" | "radius";

export interface ScalarParams {
    timeseriesId: string;
    bounds: [number, number];
}

export interface ColorParams extends ScalarParams {
    mapping: string;
}

export interface TransformParams {
    domainBounds: [number, number]; // [minVal, maxVal] for this timeseries over ALL penetrations
    targetBounds: [number, number]; // always a subset of [0, 1]
    gamma: number; // a power to raise
}

export interface AestheticParams {
    color?: ColorParams;
    opacity?: ScalarParams;
    radius?: ScalarParams;
}

export interface ScalarMapping {
    timeseriesData: TimeseriesData;
    transformParams: TransformParams;
}

export interface ColorMapping extends ScalarMapping {
    colorLUT: ColorLUT;
}

export interface AestheticMapping {
    penetrationId: string;
    color: ColorMapping;
    opacity: ScalarMapping;
    radius: ScalarMapping;
    show: number[];
}

export interface AestheticProps {
    colorTimeseries: string;
    colorBounds: [number, number];
    colorGamma: number;
    colorMapping: string;

    opacityTimeseries: string;
    opacityBounds: [number, number];
    opacityGamma: number;

    radiusTimeseries: string;
    radiusBounds: [number, number];
    radiusGamma: number;
}
