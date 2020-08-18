import { Color } from 'three';
import * as _ from 'underscore';

import { AVConstants } from '../constants';
import { IAesthetics } from './aestheticMapping';


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

    private radToPx(radius: number) {
        return radius * (35/4);
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
                for (let i = idx; i < values.length; i += stride) {
                    let wt1, wt2;
                    const denom = times[i] - times[i-1];

                    if (denom === 0) {
                        wt1 = 1;
                        wt2 = 0;
                    } else {
                        wt1 = (t - times[i-1]) / denom;
                        wt2 = (times[i] - t) / denom;
                    }

                    const val = wt1*values[i - 1] + wt2*values[i];
                    opacities[(i - idx - 1)/stride] = val;
                }
            }
        }

        return opacities;
    }

    public getRadius(t: number) {
        const stride = this.aesthetics.radius !== null ? this.aesthetics.radius.times.length : 0;

        let sizes = new Float32Array(this.nPoints);
        if (stride === 0) {
            sizes.fill(this.radToPx(this.constants.defaultRadius));
        } else {
            const times = this.aesthetics.radius.times;
            const values = this.aesthetics.radius.values;
            let idx = _.sortedIndex(times, t);

            // direct hit or time out of bounds
            if (idx === 0 || idx >= times.length - 1 || times[idx] === t) {
                idx = Math.min(idx, times.length - 1);

                for (let i = idx; i < values.length; i += stride) {
                    sizes[(i - idx) / stride] = this.radToPx(values[i]);
                }
            } else { // interpolate
                for (let i = idx; i < values.length; i += stride) {
                    let wt1, wt2;
                    const denom = times[i] - times[i-1];

                    if (denom === 0) {
                        wt1 = 1;
                        wt2 = 0;
                    } else {
                        wt1 = (t - times[i-1]) / denom;
                        wt2 = (times[i] - t) / denom;
                    }

                    const val = wt1*values[i - 1] + wt2*values[i];
                    sizes[(i - idx - 1)/stride] = this.radToPx(val);
                }
            }
        }

        return sizes;
    }
}