import React from "react";
import {AxiosResponse} from "axios";

import Plot from "react-plotly.js";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, SliceImageData} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {BaseViewer} from "../../viewers/baseViewer";
// eslint-disable-next-line import/no-unresolved
import {SliceViewer} from "../../viewers/sliceViewer";
// eslint-disable-next-line import/no-unresolved
import {APIClient} from "../../apiClient";


export type Viewer2DType = "slice" | "penetration";

export interface Viewer2DProps {
    canvasContainerId: string;
    constants: AVConstants;
    settings: AVSettings;
    viewerType: Viewer2DType;
}

interface Viewer2DState {
    renderWidth: number;
    renderHeight: number;
    viewerLoaded: boolean;
}

export class Viewer2D extends React.Component<Viewer2DProps, Viewer2DState> {
    private apiClient: APIClient;
    private viewer: SliceViewer = null;

    constructor(props: Viewer2DProps) {
        super(props);

        this.state = {
            renderWidth: 0,
            renderHeight: 0,
            viewerLoaded: false,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    private computeDims(): { width: number; height: number } {
        const container = document.getElementById(this.props.canvasContainerId);
        if (!container) {
            return { width: 0, height: 0 };
        }

        const width = container.clientWidth;
        const height = width / 1.85; // 1.85:1 aspect ratio

        return { width, height };
    }

    private async createViewer() {
        console.log("hey there");
        const { width, height } = this.computeDims();

        let v: BaseViewer;
        if (this.props.viewerType === "slice") {
            v = new SliceViewer(this.props.constants, this.props.settings.epochs);
        }

        v.container = this.props.canvasContainerId; // div is created in render()
        v.WIDTH = width;
        v.HEIGHT = height;

        v.initialize();
        // v.animate();
        this.viewer = v;
    }

    private updateDims() {
        const { width, height } = this.computeDims();
        this.setState({ renderWidth: width, renderHeight: height });

        if (this.viewer !== null) {
            this.viewer.setSize(width, height);
        }
    }

    public componentDidMount(): void {
        window.addEventListener('resize', () => this.updateDims());

        this.createViewer()
            .then(() => {
                return this.apiClient.fetchCoronalSlice(300)
            })
            .then((res: AxiosResponse<SliceImageData>) => res.data)
            .then((sliceData) => {
                this.viewer.setSlices(sliceData, "coronal");
            })
            .catch((err: Error) => console.error(err));
    }

    public render() {
        return <div style={{ padding: 40 }}
                    id={this.props.canvasContainerId}>
            {/*{plot}*/}
        </div>
    }
}