import * as _ from "lodash";

// eslint-disable-next-line import/no-unresolved
import {AestheticType} from "./models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesEntry} from "./models/timeseries";

const ctx: Worker = self as any;

const transformValues = function(data: number[], transformBounds: [number, number]): number[] {
    let dataMin = data[0];
    let dataMax = data[0];
    data.forEach(x => {
        dataMin = Math.min(x, dataMin);
        dataMax = Math.max(x, dataMax);
    });
    const dataRange = dataMax - dataMin;

    const transformMin = transformBounds[0];
    const transformMax = transformBounds[1];
    const transformRange = transformMax - transformMin;

    let xValues;
    if (dataMin === dataMax) {
        xValues = data.map(() => (transformMax - transformMin) / 2);
    } else {
        xValues = data.map((x) =>
            transformMin + transformRange*(x - dataMin)/dataRange
        );
    }

    return xValues;
}

ctx.addEventListener("message", (event: MessageEvent) => {
    const data: {entry: TimeseriesEntry; aesthetic: AestheticType; bounds: [number, number]} = event.data;
    if (data !== undefined) {
        const aesthetic = data.aesthetic;
        const entry = data.entry;

        entry.values = transformValues(entry.values, data.bounds);

        ctx.postMessage({entry, aesthetic});
    }
});
