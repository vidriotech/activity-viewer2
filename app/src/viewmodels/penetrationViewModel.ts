import { Color } from 'three';
import * as _ from 'underscore';

import { AVConstants } from '../constants';
import { IAesthetics } from './aestheticMapping';
import { isNaN } from 'underscore';


export class PenetrationViewModel {
    private aesthetics: IAesthetics;
    private constants: AVConstants;
    private defaultColor: Color;
    private nPoints: number;

    constructor(aesthetics: IAesthetics, nPoints: number) {
        this.aesthetics = aesthetics;
        this.nPoints = nPoints;

        this.constants = new AVConstants();
        this.defaultColor = new Color(this.constants.defaultColor);
    }

    private interpValues(times: number[], values: number[], t: number, idx: number, stride: number, newValues: Float32Array) {
        const t0 = times[idx-1];
        const t1 = times[idx];
        const denom = t1 - t0;

        for (let i = idx - 1; i < values.length; i += stride) {
            let wt1, wt2;

            if (denom === 0) {
                wt1 = 1;
                wt2 = 0;
            } else {
                wt1 = (t - t0) / denom;
                wt2 = (t1 - t) / denom;
            }

            const val = wt1*values[i - 1] + wt2*values[i];
            newValues[(i - (idx - 1))/stride] = val;
        }
    }

    public getColor(t: number) {
        const stride = this.aesthetics.color !== null ? this.aesthetics.color.times.length : 0;
        
        let colors = new Float32Array(3 * this.nPoints);
        if (stride === 0) {
            for (let i = 0; i < 3 * this.nPoints; i += 3) {
                colors[i] = this.defaultColor.r;
                colors[i + 1] = this.defaultColor.g;
                colors[i + 2] = this.defaultColor.b;
            }
        } else {
            // placeholder
            for (let i = 0; i < 3 * this.nPoints; i += 3) {
                colors[i] = this.defaultColor.r;
                colors[i + 1] = this.defaultColor.g;
                colors[i + 2] = this.defaultColor.b;
            }
        }

        return colors;
    }

    public getOpacity(t: number) {
        const stride = this.aesthetics.opacity !== null ? this.aesthetics.opacity.times.length : 0;

        let opacities = new Float32Array(this.nPoints);
        if (stride === 0) {
            opacities.fill(0.3);
        } else {
            const times = this.aesthetics.opacity.times;
            const values = this.aesthetics.opacity.values;
            let idx = _.sortedIndex(times, t);

            // direct hit or time out of bounds
            if (idx === 0 || idx >= times.length - 1 || times[idx] === t) {
                idx = Math.min(idx, times.length - 1);

                for (let i = idx; i < values.length; i += stride) {
                    opacities[(i - idx) / stride] = values[i];
                }
            } else { // interpolate
                this.interpValues(times, values, t, idx, stride, opacities);
            }
        }

        return opacities;
    }

    public getRadius(t: number) {
        const stride = this.aesthetics.radius !== null ? this.aesthetics.radius.times.length : 0;
        const radToPx = (radius: number) => radius * (35/4);

        let sizes = new Float32Array(this.nPoints);
        if (stride === 0) {
            sizes.fill(radToPx(this.constants.defaultRadius));
        } else {
            const times = this.aesthetics.radius.times;
            const values = this.aesthetics.radius.values;
            let idx = _.sortedIndex(times, t);

            // direct hit or time out of bounds
            if (idx === 0 || idx >= times.length - 1 || times[idx] === t) {
                idx = Math.min(idx, times.length - 1);

                for (let i = idx; i < values.length; i += stride) {
                    sizes[(i - idx) / stride] = radToPx(values[i]);
                }
            } else { // interpolate
                this.interpValues(times, values, t, idx, stride, sizes);
                sizes = sizes.map(x => radToPx(x));
            }
        }

        return sizes;
    }

    public getVisible() {
        if (this.aesthetics.visible === null) {
            let visible = new Float32Array(this.nPoints);
            visible.fill(1.0);
            return visible;
        }

        return new Float32Array(this.aesthetics.visible.map(x => x ? 1.0 : 0.0));
    }
}