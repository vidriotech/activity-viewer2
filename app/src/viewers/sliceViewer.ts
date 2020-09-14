import React from 'react';

import * as Plotly from "plotly.js";
import * as _ from "lodash";

// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../constants"

// eslint-disable-next-line import/no-unresolved
import {Epoch, PenetrationData, SliceImageData} from "../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import { PenetrationViewModel } from "../viewmodels/penetrationViewModel";
// eslint-disable-next-line import/no-unresolved
import { AestheticMapping } from "../viewmodels/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {BaseViewer} from "./baseViewer";


type SliceType = "coronal" | "sagittal" | "horizontal";

export class SliceViewer extends BaseViewer {
    private plotId = "viewer-plot";
    private sliceData: SliceImageData = null;
    private sliceType: SliceType;

    constructor(constants: AVConstants, epochs: Epoch[]) {
        super(constants, epochs);
    }

    public initialize(): void {
        const canvas = document.createElement("canvas");
        canvas.id = this.canvasId;
        canvas.height = this.WIDTH;
        canvas.width = this.WIDTH;

        const plotDiv = document.createElement("div");
        plotDiv.id = this.plotId;

        document.getElementById(this.container).append(canvas, plotDiv)

        const imageObj = new Image();
        imageObj.onload = () => this.drawImage(imageObj);
        imageObj.crossOrigin = "Anonymous";
        imageObj.src = "https://images.plot.ly/plotly-documentation/images/heatmap-galaxy.jpg";
    }

    public loadPenetration(penetrationData: PenetrationData) {
        console.log(penetrationData);
    }

    public setSize(width: number, height: number): void {
        console.log(`${width}, ${height}`);
    }

    public setSlices(sliceData: SliceImageData, sliceType: SliceType) {
        this.sliceData = sliceData;
        this.sliceType = sliceType;
    }

    public drawImage(imageObj: HTMLImageElement) {
        const canvas = document.getElementById(this.canvasId) as HTMLCanvasElement;
        canvas.style.display = "none";

        const context = canvas.getContext("2d");
        const imageX = 0;
        const imageY = 0;
        const imageWidth = imageObj.width;
        const imageHeight = imageObj.height;

        context.drawImage(imageObj, imageX, imageY);

        const imageData = context.getImageData(imageX, imageY, imageWidth, imageHeight);
        const imgData = imageData.data;

        // pick out pixel data from x, y coordinate
        const zData = [];

        let x, y, red, green, blue, alpha;

        // iterate over all pixels based on x and y coordinates
        for (y = 0; y < imageHeight; y++) {
            // loop through each column
            for (x = 0; x < imageWidth; x++) {
                red = imgData[(imageWidth * y + x) * 4];
                green = imgData[(imageWidth * y + x) * 4 + 1];
                blue = imgData[(imageWidth * y + x) * 4 + 2];
                alpha = imgData[(imageWidth * y + x) * 4 + 3];
                zData.push(red + green + blue + alpha);
            }
        }

        const createGroupedArray = function(arr: number[], chunkSize: number) {
            const groups = [];
            for (let i = 0; i < arr.length; i += chunkSize) {
                groups.push(arr.slice(i, i + chunkSize));
            }
            return groups;
        };

        // Grouping zdata into 500x500
        const zDataGrouped = createGroupedArray(zData, 500);
        const entry = {
            z: zDataGrouped,
            type: "heatmapgl" as Plotly.PlotType,
            colorscale: "Picnic"
        } as Partial<Plotly.PlotData>;
        const data = [entry]

        Plotly.plot(this.plotId, data, {}, {showSendToCloud: true});
    }
}
