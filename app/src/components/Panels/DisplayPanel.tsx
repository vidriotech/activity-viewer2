import React from "react";

import Grid from "@material-ui/core/Grid";

// eslint-disable-next-line import/no-unresolved
import {ViewerContainer, ViewerContainerProps} from "../Viewers/ViewerContainer";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, PenetrationData} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Predicate} from "../../models/predicateModels";

// eslint-disable-next-line import/no-unresolved
import {CompartmentNodeView} from "../../viewmodels/compartmentViewModel";

export interface DisplayPanelProps {
    availablePenetrations: PenetrationData[];
    compartmentViewTree: CompartmentNodeView;
    constants: AVConstants;
    settings: AVSettings;

    colorTimeseries: string;
    colorBounds: [number, number];
    colorGamma: number;
    colorMapping: string;

    opacityTimeseries: string;
    opacityBounds: [number, number];
    opacityGamma: number;

    radiusTimeseries: string;
    radiusBounds: [number, number];
    radiusGamma: number;

    busy: boolean;
    progress: number;
    progressMessage: string;

    onUpdateFilterPredicate(predicate: Predicate, newStat?: string): void;
    onUpdateProgress(progress: number, progressMessage: string): void;
}

interface DisplayPanelState {
    showLeft: boolean;
    showRight: boolean;
}

export class DisplayPanel extends React.Component<DisplayPanelProps, DisplayPanelState> {
    constructor(props: DisplayPanelProps) {
        super(props);

        this.state = {
            showLeft: false,
            showRight: false,
        };
    }

    public render(): React.ReactElement {
        const viewerContainerProps: ViewerContainerProps = {
            compartmentViewTree: this.props.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,

            colorTimeseries: this.props.colorTimeseries,
            colorBounds: this.props.colorBounds,
            colorGamma: this.props.colorGamma,
            colorMapping: this.props.colorMapping,

            opacityTimeseries: this.props.opacityTimeseries,
            opacityBounds: this.props.opacityBounds,
            opacityGamma: this.props.opacityGamma,

            radiusTimeseries: this.props.radiusTimeseries,
            radiusBounds: this.props.radiusBounds,
            radiusGamma: this.props.radiusGamma,

            availablePenetrations: this.props.availablePenetrations,
            busy: this.props.busy,
            progress: this.props.progress,
            progressMessage: this.props.progressMessage,

            showLeft: this.state.showLeft,
            showRight: this.state.showRight,

            onExpandContract: (side: "l" | "r"): void => {
                if (side === "l") {
                    this.setState({showLeft: !this.state.showLeft});
                } else if (side === "r") {
                    this.setState({showRight: !this.state.showRight});
                }
            },
            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
            onUpdateProgress: this.props.onUpdateProgress,
        };

        const viewerContainerSize = 12 - 3 * (Number(this.state.showLeft) + Number(this.state.showRight));

        return (
            <Grid container>
                <Grid item xs={viewerContainerSize as 6 | 9 | 12}>
                    <ViewerContainer {...viewerContainerProps} />
                </Grid>
            </Grid>
        );
    }
}
