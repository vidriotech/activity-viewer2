import * as _ from "lodash";

// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../constants";
// eslint-disable-next-line import/no-unresolved
import {AestheticMapping, AestheticType} from "../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "../models/colorMap";

export class PenetrationViewModel {
    private readonly aestheticMapping: AestheticMapping;
    private readonly nPoints: number;

    private constants: AVConstants;

    constructor(aestheticMapping: AestheticMapping, nPoints: number) {
        this.aestheticMapping = aestheticMapping;
        this.nPoints = nPoints;

        this.constants = new AVConstants();
    }

    private getScalar(aesthetic: AestheticType, t: number): number[] {
        const mapping = this.aestheticMapping[aesthetic];
        const mapVals = new Array(this.nPoints);

        if (mapping === null || mapping.timeseriesData.times === null) {
            switch (aesthetic) {
                case "color":
                    mapVals.fill(0);
                    break;
                case "opacity":
                    mapVals.fill(this.constants.defaultOpacity);
                    break;
                case "radius":
                    mapVals.fill(this.constants.defaultRadius);
                    break;
            }
        } else {
            this.interpTransform(aesthetic, t, mapVals);
        }

        return mapVals;
    }

    private interpTransform(aesthetic: AestheticType, t: number, newValues: number[]): void {
        // since this is only called from getScalar (which has a guard against null mappings)
        // mapping should never be null here
        const mapping = this.aestheticMapping[aesthetic];

        // a nonlinear transformation after the mapping
        const gamma = mapping.transformParams.gamma;

        // compute linear mapping on the fly
        const domainBounds = mapping.transformParams.domainBounds;
        const domainSpan = Math.abs(domainBounds[1] - domainBounds[0]);
        const targetBounds = mapping.transformParams.targetBounds;
        const targetSpan = Math.abs(targetBounds[1] - targetBounds[0]);

        // compute the weighted average of x0 and x1 with weights
        // w0 := |t - t0| / |t1 - t0|; and w1 := |t1 - t| / |t1 - t0|
        const interp = function (x0: number, x1: number, t0: number, t1: number, t: number): number {
            let w0: number, w1: number; // weights

            const tSpan = Math.abs(t1 - t0);
            if (tSpan < 1e-9) {
                w0 = 1;
                w1 = 0;
            } else {
                w0 = (t - t0) / tSpan;
                w1 = (t1 - t) / tSpan;
            }

            return x0 * w0 + x1 * w1;
        };

        const extrap = function(x0: number, x1: number, t0: number, t1: number, t: number): number {
            const tSpan = Math.abs(t1 - t0);
            const xSpan = x1 - x0;

            let slope: number;

            // default to constant (if x1 != x0 we have bigger problems)
            if (tSpan < 1e-9) {
                slope = 0;
            } else {
                slope = xSpan / tSpan;
            }

            return slope*(t - t1) + x1;
        };

        // map [a, b] => [c, d] ::: y = (d - c) * (x - a)/(b - a) + c for x in [a, b]
        const transform = function(x: number): number {
            return targetSpan * (x - domainBounds[0]) / domainSpan + targetBounds[0];
        };

        const times = mapping.timeseriesData.times;
        const timeIdx = _.sortedIndex(times, t);

        const values = mapping.timeseriesData.values;
        const stride = times.length;

        // for (let i = timeIdx; i < values.length; i += stride) {
        for (let i = 0; i < times.length; i++) {
            const valIdx = i * stride + timeIdx;
            let val: number;

            if (domainSpan < 1e-9 || targetSpan < 1e-9) {
                // two cases where we can skip both interpolation and transformation:
                // domain is a single point, so map to midpoint of target; or
                // target is a single point, its "midpoint" is itself
                val = (targetBounds[0] + targetBounds[1]) / 2;
            } else if (timeIdx < times.length && t === times[timeIdx]) {
                // t falls exactly on an index value
                val = transform(values[valIdx]);
            } else if (timeIdx === 0) {
                // t is smaller than our smallest time, so we need to extrapolate
                const t0 = times[timeIdx + 1];
                const t1 = times[timeIdx];

                const x0 = values[valIdx + 1]
                const x1 = values[valIdx];

                val = transform(extrap(x0, x1, t0, t1, t));
            } else if (timeIdx === times.length) {
                // t is larger than our largest time, so we need to extrapolate
                const t0 = times[timeIdx - 2];
                const t1 = times[timeIdx - 1];

                const x0 = values[valIdx - 2];
                const x1 = values[valIdx - 1];

                val = transform(extrap(x0, x1, t0, t1, t));
            } else {
                // 0 < timeIdx < times.length
                const t0 = times[timeIdx - 1];
                const t1 = times[timeIdx];

                const x0 = i > 0 ? values[i - 1] : values[i];
                const x1 = values[i];

                const interpVal = interp(x0, x1, t0, t1, t);
                val = transform(interpVal);
            }

            newValues[(i - timeIdx)/stride] = Math.pow(val, gamma);
        }
    }

    public getColor(t: number): Float32Array {
        const colors = new Float32Array(3 * this.nPoints);
        let colorLUT: ColorLUT;

        if (this.aestheticMapping.color === null) {
            colorLUT = this.constants.defaultColorLUT;
        } else {
            colorLUT = this.aestheticMapping.color.colorLUT;
        }

        const mapVals = this.getScalar("color", t).map((x) => (
            Math.floor(x * 255)
        ));
        mapVals.forEach((v, idx) => {
            const [r, g, b] = colorLUT.mapping.slice(3 * v, 3 * (v + 1));
            colors[3 * idx] = r;
            colors[3 * idx + 1] = g;
            colors[3 * idx + 2] = b;
        });

        return colors;
    }

    public getOpacity(t: number): Float32Array {
        return new Float32Array(this.getScalar("opacity", t));
    }

    public getRadius(t: number): Float32Array {
        return new Float32Array(this.getScalar("radius", t).map((x) => (
            x * this.constants.radiusCoef
        )));
    }

    public getVisible(): Float32Array {
        let visible: Float32Array;

        if (this.aestheticMapping.show === null) {
            visible = new Float32Array(this.nPoints);
            visible.fill(1.0);
        } else {
            visible = new Float32Array(this.aestheticMapping.show);
        }

        return visible;
    }
}
