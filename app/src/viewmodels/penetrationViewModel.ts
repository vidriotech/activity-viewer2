import { Color } from 'three';
import * as _ from 'underscore';

// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../constants";
// eslint-disable-next-line import/no-unresolved
import { AestheticMapping } from "../models/aestheticMapping";


export class PenetrationViewModel {
    private aestheticMapping: AestheticMapping;
    private constants: AVConstants;
    private defaultColor: Color;
    private readonly nPoints: number;

    constructor(aestheticMapping: AestheticMapping, nPoints: number) {
        this.aestheticMapping = aestheticMapping;
        this.nPoints = nPoints;

        this.constants = new AVConstants();
        this.defaultColor = new Color(this.constants.defaultColor);
    }

    private interpScalar(times: number[], values: number[], t: number, idx: number, stride: number, newValues: Float32Array) {
        const t0 = times[idx-1];
        const t1 = times[idx];
        const tRange = t1 - t0;

        for (let i = idx - 1; i < values.length; i += stride) {
            let wt0, wt1;

            if (tRange === 0) {
                wt0 = 1;
                wt1 = 0;
            } else {
                wt0 = (t - t0) / tRange;
                wt1 = (t1 - t) / tRange;
            }

            const val = wt0*values[i - 1] + wt1*values[i];
            newValues[(i - (idx - 1))/stride] = val;
        }
    }

    public getColor(t: number) {
        const stride = this.aestheticMapping.color !== null ? this.aestheticMapping.color.times.length : 0;

        const mapVals = new Float32Array(this.nPoints);
        const colors = new Float32Array(3 * this.nPoints);
        if (stride === 0) {
            for (let i = 0; i < colors.length; i += 3) {
                colors[i] = this.defaultColor.r;
                colors[i + 1] = this.defaultColor.g;
                colors[i + 2] = this.defaultColor.b;
            }
        } else {
            const times = this.aestheticMapping.color.times;
            const values = this.aestheticMapping.color.values;
            let idx = _.sortedIndex(times, t);

            // direct hit or time out of bounds
            if (idx === 0 || idx >= times.length - 1 || times[idx] === t) {
                idx = Math.min(idx, times.length - 1);

                for (let i = idx; i < values.length; i += stride) {
                    mapVals[(i - idx) / stride] = values[i];
                }
            } else { // interpolate
                this.interpScalar(times, values, t, idx, stride, mapVals);
            }

            mapVals.forEach((v, idx) => {
                const lutKey = Math.floor(v);

                const [r, g, b] = this.aestheticMapping.color.colorLUT.mapping.slice(3 * lutKey, 3 * (lutKey + 1));
                colors[3 * idx] = r;
                colors[3 * idx + 1] = g;
                colors[3 * idx + 2] = b;
            });
        }

        return colors;
    }

    public getOpacity(t: number) {
        const stride = this.aestheticMapping.opacity !== null ? this.aestheticMapping.opacity.times.length : 0;

        const opacities = new Float32Array(this.nPoints);
        if (stride === 0) {
            opacities.fill(0.3);
        } else {
            const times = this.aestheticMapping.opacity.times;
            const values = this.aestheticMapping.opacity.values;
            let idx = _.sortedIndex(times, t);

            // direct hit or time out of bounds
            if (idx === 0 || idx >= times.length - 1 || times[idx] === t) {
                idx = Math.min(idx, times.length - 1);

                for (let i = idx; i < values.length; i += stride) {
                    opacities[(i - idx) / stride] = values[i];
                }
            } else { // interpolate
                this.interpScalar(times, values, t, idx, stride, opacities);
            }
        }

        return opacities;
    }

    public getRadius(t: number) {
        const stride = this.aestheticMapping.radius !== null ? this.aestheticMapping.radius.times.length : 0;
        const radToPx = (radius: number) => radius * (35/4);

        let sizes = new Float32Array(this.nPoints);
        if (stride === 0) {
            sizes.fill(radToPx(this.constants.defaultRadius));
        } else {
            const times = this.aestheticMapping.radius.times;
            const values = this.aestheticMapping.radius.values;
            let idx = _.sortedIndex(times, t);

            // direct hit or time out of bounds
            if (idx === 0 || idx >= times.length - 1 || times[idx] === t) {
                idx = Math.min(idx, times.length - 1);

                for (let i = idx; i < values.length; i += stride) {
                    sizes[(i - idx) / stride] = radToPx(values[i]);
                }
            } else { // interpolate
                this.interpScalar(times, values, t, idx, stride, sizes);
                sizes = sizes.map(x => radToPx(x));
            }
        }

        return sizes;
    }

    public getVisible() {
        if (this.aestheticMapping.visibility === null) {
            const visible = new Float32Array(this.nPoints);
            visible.fill(1.0);
            return visible;
        }

        return new Float32Array(this.aestheticMapping.visibility);
    }
}
