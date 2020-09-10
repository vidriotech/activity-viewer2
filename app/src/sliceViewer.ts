import React from 'react';

import * as Plotly from 'plotly.js';

import { AVConstants } from './constants'

import { Epoch, PenetrationData } from './models/apiModels';

import { PenetrationViewModel } from './viewmodels/penetrationViewModel';
import { IAesthetics } from './viewmodels/aestheticMapping';

export class SliceViewer {
    private constants: AVConstants;
    private epochs: Epoch[];

    private annotationSlice: number[];
    private templateSlice: number[];
    private stride: number;

    private penetrationViewModelsMap: Map<string, PenetrationViewModel>;

    // animation
    private _timeVal: number = 0;
    
    public HEIGHT: number;
    public WIDTH: number;
    public container = 'container';

    constructor(constants: AVConstants, epochs: Epoch[]) {
        this.constants = constants;
        this.epochs = epochs.sort((e1, e2) => e1.bounds[0] - e2.bounds[0]);

        this.penetrationViewModelsMap = new Map<string, PenetrationViewModel>();
    }

    public initialize() {

    }

    public loadPenetration(penetrationData: PenetrationData) {
        
    }

    public setSlices(annotationSlice: number[], templateSlice: number[], stride: number) {
        this.annotationSlice = annotationSlice;
        this.templateSlice = templateSlice;
        this.stride = stride;
    }

    // public loadPenetration(penetrationData: IPenetrationData) {
    //     function HeatmapGLfromImage() {
    //         var img = new Image();
    //         img.setAttribute(
    //             'src',
    //             processdata(
    //                 'https://images.plot.ly/plotly-documentation/images/heatmap-galaxy.jpg'
    //             )
    //         );
    //     }

    //     function processdata(url) {
    //         const canvas = document.getElementById(this.container)
    //             .querySelector('canvas') as HTMLCanvasElement;

    //         var img = new Image();
    //         img.crossOrigin = 'anonymous';
    //         img.src = url;

    //         let ctx = canvas.getContext('2d');
    //         ctx.drawImage(img, 0, 0);

    //         const width = img.width;
    //         const height = img.height;

    //         var l = width * height;
    //         var arr = ctx.getImageData(0, 0, width, height).data;

    //         var zdata = [];
    //         for (var i = 0; i < l; i++) {
    //             // get color of pixel
    //             var r = arr[i * 4]; // Red
    //             var g = arr[i * 4 + 1]; // Green
    //             var b = arr[i * 4 + 2]; // Blue
    //             var a = arr[i * 4 + 3]; // Alpha
    //             zdata.push(r + g + b + a);
    //         }

    //         var createGroupedArray = function(arr, chunkSize) {
    //             var groups = [],
    //                 i;
    //             for (i = 0; i < arr.length; i += chunkSize) {
    //                 groups.push(arr.slice(i, i + chunkSize));
    //             }
    //             return groups;
    //         };

    //         // Grouping zdata into 500x500
    //         var zdata = createGroupedArray(zdata, 500);

    //         var data = [
    //             {
    //                 z: zdata,
    //                 type: 'heatmapgl',
    //                 colorscale: 'Picnic'
    //             }
    //         ];

    //         Plotly.newPlot('myDiv', data);
    //     }

    //     HeatmapGLfromImage();
    // }
}
