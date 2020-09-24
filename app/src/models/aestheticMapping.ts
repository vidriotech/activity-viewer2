// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "./colorMap";
import {TimeseriesEntry} from "./timeseries";

export type AestheticSelection = "selectedColor" | "selectedOpacity" | "selectedRadius";
export type AestheticType = "color" | "opacity" | "radius";

export interface ScalarParams {
    timeseriesId: string;
    bounds: [number, number];
}

export interface ColorParams extends ScalarParams {
    mapping: string;
}

export interface AestheticParams {
    color?: ColorParams;
    opacity?: ScalarParams;
    radius?: ScalarParams;
}

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

export interface AestheticProps {
    colorBounds: [number, number];
    opacityBounds: [number, number];
    radiusBounds: [number, number];
    selectedColor: string;
    selectedColorMapping: string;
    selectedOpacity: string;
    selectedRadius: string;
}

export interface TransformParams {
    entry: TimeseriesEntry;
    aesthetic: AestheticType;
    dataBounds: [number, number];
    transformBounds: [number, number];
}