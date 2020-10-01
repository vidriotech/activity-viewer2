import React from "react";

import Grid from "@material-ui/core/Grid";

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
import {headerStyle} from "../../styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";

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

    private renderHeader(): React.ReactElement {
        const xs = 12 - (this.state.showLeft ? 3 : 1) - (this.state.showRight ? 3 : 1);
        const expandContractLeft = this.state.showLeft ?
            <Grid container item
                  justify="flex-end"
                  xs={3}>
                <Grid item xs>
                    <Typography align="center"
                                variant="h6"
                                component="h4"
                                gutterBottom>
                        Units
                    </Typography>
                </Grid>
                <Grid item xs={1}>
                    <IconButton color="inherit"
                                size="small"
                                onClick={(): void => {
                                    this.setState({showLeft: false})
                                }}>
                        <ChevronLeft />
                    </IconButton>
                </Grid>
            </Grid> :
            <Grid container item
                  justify="flex-start"
                  xs={1}>
                <IconButton color="inherit"
                            size="small"
                            onClick={(): void => {
                                this.setState({showLeft: true})
                            }}>
                    <ChevronRight />
                </IconButton>
            </Grid>;

        const expandContractRight = this.state.showRight ?
            <Grid container item
                  justify="flex-start"
                  xs={3}>
                <Grid item xs={1}>
                    <IconButton aria-label="showOrHideUnitTable"
                                color="inherit"
                                size="small"
                                onClick={(): void => {
                                    this.setState({showRight: false})
                                }}>
                        <ChevronRight />
                    </IconButton>
                </Grid>
                <Grid item xs>
                    <Typography align="center"
                                variant="h6"
                                component="h4"
                                gutterBottom>
                        Compartments
                    </Typography>
                </Grid>
            </Grid> :
            <Grid container item
                  justify="flex-end"
                  xs={1}>
                <IconButton color="inherit"
                            size="small"
                            onClick={(): void => {
                                this.setState({showRight: true})
                            }}>
                    <ChevronLeft />
                </IconButton>
            </Grid>;

        return <div style={headerStyle}>
            <Grid container
                  item
                  spacing={0} >
                {expandContractLeft}
                <Grid container item xs={xs as 6 | 8 | 10 | 12}
                      justify="flex-start">
                    {this.props.progress < 1 ?
                        <Grid item xs={1}>
                            <CircularProgress color="secondary"
                                              variant="indeterminate"
                                              value={100 * this.props.progress}
                                              size={30} />

                        </Grid> : null
                    }
                    {this.props.progress < 1 ?
                        <Grid item xs>
                            <Typography align="left" gutterBottom>
                                {this.props.progressMessage}
                            </Typography>
                        </Grid> : null
                    }
                </Grid>
                {expandContractRight}
            </Grid>
        </div>
    }

    public render(): React.ReactElement {
        const unitTableProps: UnitTableProps = {
            availablePenetrations: this.props.availablePenetrations,
            busy: this.props.busy,

            onRequestUnitExport: this.props.onRequestUnitExport,
        };

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

            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
            onUpdateProgress: this.props.onUpdateProgress,
        };

        const compartmentListProps: CompartmentListProps = {
            availablePenetrations: this.props.availablePenetrations,
            busy: this.props.busy,
            compartmentViewTree: this.props.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,

            onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,
        };

        const xs = 12 - 3 * (Number(this.state.showLeft) + Number(this.state.showRight));

        const header = this.renderHeader();

        return (
            <Grid container
                  spacing={0} >
                <Grid item xs={12}>{header}</Grid>
                {this.state.showLeft ?
                    <Grid item xs={3}>
                        <UnitTable {...unitTableProps} />
                    </Grid> :
                    null
                }
                <Grid item xs={xs as 6 | 9 | 12}>
                    <ViewerContainer {...viewerContainerProps} />
                </Grid>
                {this.state.showRight ?
                    <Grid item xs={3}>
                        <CompartmentList {...compartmentListProps} />
                    </Grid> :
                    null
                }
            </Grid>
        );
    }
}
