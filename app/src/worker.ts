import * as _ from "lodash";

// eslint-disable-next-line import/no-unresolved
import {AestheticType, TransformParams} from "./models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesData} from "./models/timeseries";

const ctx: Worker = self as any;

const transformValues = function(data: number[], transformBounds: [number, number], dataBounds: [number, number]): number[] {
    const dataMin = dataBounds[0];
    const dataMax = dataBounds[1];
    const dataRange = dataMax - dataMin;

    const transformMin = transformBounds[0];
    const transformMax = transformBounds[1];
    const transformRange = transformMax - transformMin;

    let xValues;
    if (dataRange === 0) {
        xValues = data.map(() => (transformMax - transformMin) / 2);
    } else {
        xValues = data.map((x) =>
            transformMin + transformRange*(x - dataMin)/dataRange
        );
    }

    return xValues;
}

// ctx.addEventListener("message", (event: MessageEvent) => {
//     const data: TransformParams = event.data;
//     if (data !== undefined) {
//         const aesthetic = data.aesthetic;
//         const entry = data.entry;
//
//         entry.values = transformValues(entry.values, data.targetBounds, data.domainBounds);
//
//         ctx.postMessage({entry, aesthetic});
//     }
// });
