import React from "react";

import CircularProgress from "@material-ui/core/CircularProgress";
import Grid from "@material-ui/core/Grid";
import SaveIcon from "@material-ui/icons/Save";
import Typography from "@material-ui/core/Typography";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, PenetrationData} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Predicate} from "../../models/predicateModels";

// eslint-disable-next-line import/no-unresolved
import {CompartmentNodeView} from "../../viewmodels/compartmentViewModel";

// eslint-disable-next-line import/no-unresolved
import {CompartmentList, CompartmentListProps} from "../CompartmentList/CompartmentList";
// eslint-disable-next-line import/no-unresolved
import {UnitTable, UnitTableProps} from "../UnitTable/UnitTable";
// eslint-disable-next-line import/no-unresolved
import {ViewerContainer, ViewerContainerProps} from "../Viewers/ViewerContainer";
import IconButton from "@material-ui/core/IconButton";
import {ChevronLeft, ChevronRight} from "@material-ui/icons";
// eslint-disable-next-line import/no-unresolved
import {headerStyle} from "../../styles";

// eslint-disable-next-line import/no-unresolved
import {PhysiologyPanel, PhysiologyPanelProps} from "./PhysiologyPanel";
import {DataPanel, DataPanelProps} from "./DataPanel";

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

    onToggleCompartmentVisible(rootNode: CompartmentNodeView): void;
    onRequestUnitExport(): void;
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
            showLeft: true,
            showRight: true,
        };
    }

    public render(): React.ReactElement {
        const unitTableProps: UnitTableProps = {
            availablePenetrations: this.props.availablePenetrations,
            busy: this.props.busy,
        };

        const dataPanelProps: DataPanelProps = {
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            settings: this.props.settings,

            busy: this.props.busy,

            onCollapse: () => {this.setState({showLeft: false})},
            onRequestUnitExport: this.props.onRequestUnitExport,
        }

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

            onExpand: (side: "l" | "r"): void => {
                if (side === "l") {
                    this.setState({showLeft: true});
                } else if (side === "r") {
                    this.setState({showRight: true});
                }
            },
            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
            onUpdateProgress: this.props.onUpdateProgress,
        };

        const physiologyPanelProps: PhysiologyPanelProps = {
            availablePenetrations: this.props.availablePenetrations,
            busy: this.props.busy,
            compartmentViewTree: this.props.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,

            onCollapse: () => {this.setState({showRight: false})},
            onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,
        };

        const xs = 12 - 3 * (Number(this.state.showLeft) + Number(this.state.showRight));

        return (
            <Grid container
                  spacing={0}
                  style={{
                      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                      // @ts-ignore
                      "border-top": "1px solid black",
                      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                      // @ts-ignore
                      "border-bottom": "1px solid black",
                      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                      // @ts-ignore
                      "border-right": this.state.showRight ? "1px solid black" : "none",
                      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                      // @ts-ignore
                      "border-left": this.state.showLeft ? "1px solid black" : "none",
                      margin: 0
                  }}>
                {this.state.showLeft ?
                    <Grid item xs={3}>
                        <DataPanel {...dataPanelProps} />
                    </Grid> :
                    null
                }
                <Grid item xs={xs as 6 | 9 | 12}>
                    <ViewerContainer {...viewerContainerProps} />
                </Grid>
                {this.state.showRight ?
                    <Grid item xs={3}>
                        <PhysiologyPanel {...physiologyPanelProps} />
                    </Grid> :
                    null
                }
            </Grid>
        );
    }
}
